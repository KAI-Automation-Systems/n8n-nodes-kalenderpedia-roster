// nodes/KalenderpediaRosterParser/pdf.ts

// Gebruik de legacy CommonJS build van pdfjs-dist (stabiel in Node/tsc commonjs)
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';
import pdfParse from 'pdf-parse';

export class PdfParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PdfParseError';
  }
}

interface TextItem {
  str: string;
  transform: number[]; // [a,b,c,d,e,f] -> e=x, f=y
  x: number;
  y: number;
}

interface DayColumn {
  dayNumber: number;
  xPosition: number;
  textItems: TextItem[];
}

const COLUMN_TOLERANCE = 20; // px

// Worker instellen voor legacy build (CommonJS)
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const workerSrc = require('pdfjs-dist/legacy/build/pdf.worker.js');
  // Sommige bundlers geven een object terug; pak dan .default
  (pdfjsLib as any).GlobalWorkerOptions.workerSrc = (workerSrc as any).default || workerSrc;
} catch {
  // Laat pdfjs zonder aparte worker draaien. In Node werkt dat meestal ook.
}

async function extractWithPdfJs(pdfBuffer: Buffer): Promise<number[]> {
  try {
    const loadingTask = (pdfjsLib as any).getDocument({
      data: pdfBuffer,
      isEvalSupported: false,
      // geen ongeldige opties zoals useSystemFonts
    });
    const pdf = await loadingTask.promise;
    const daysWithSabine = new Set<number>();

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      const dayColumns: Map<number, DayColumn> = new Map();
      const textItems: TextItem[] = [];

      // Items casten en (x,y) pakken uit transform
      for (const anyItem of textContent.items as any[]) {
        const s = String(anyItem.str ?? '').trim();
        const tf = (anyItem.transform ?? []) as number[];
        const x = Number(tf[4] ?? 0);
        const y = Number(tf[5] ?? 0);
        textItems.push({ str: s, transform: tf, x, y });
      }

      // Dagkoppen 1..31 zoeken
      const dayHeaderRegex = /^([1-9]|[12][0-9]|3[01])$/;
      for (const it of textItems) {
        if (dayHeaderRegex.test(it.str)) {
          const dayNum = parseInt(it.str, 10);
          if (!dayColumns.has(dayNum)) {
            dayColumns.set(dayNum, { dayNumber: dayNum, xPosition: it.x, textItems: [] });
          }
        }
      }

      // Als er geen kolommen gedetecteerd zijn, laat pdfjs hier falen zodat we fallbacken
      if (dayColumns.size === 0) {
        throw new Error('no day columns detected');
      }

      // Assign per dichtstbijzijnde X
      for (const it of textItems) {
        let closest: DayColumn | null = null;
        let min = Infinity;
        for (const col of dayColumns.values()) {
          const d = Math.abs(it.x - col.xPosition);
          if (d < COLUMN_TOLERANCE && d < min) {
            min = d;
            closest = col;
          }
        }
        if (closest) closest.textItems.push(it);
      }

      // "Sabine" in kolom => dag toevoegen
      for (const col of dayColumns.values()) {
        if (col.textItems.some(t => t.str.includes('Sabine'))) {
          daysWithSabine.add(col.dayNumber);
        }
      }
    }

    return Array.from(daysWithSabine).sort((a, b) => a - b);
  } catch (err) {
    throw new PdfParseError(`pdfjs-dist failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function extractWithPdfParse(pdfBuffer: Buffer): Promise<number[]> {
  try {
    const data = await pdfParse(pdfBuffer);
    const lines = data.text.split(/\r?\n/).map(l => l.trim());
    const days = new Set<number>();

    const dayHeader = /^([1-9]|[12][0-9]|3[01])\b/;

    let currentDay: number | null = null;
    let block: string[] = [];

    const flush = () => {
      if (currentDay !== null) {
        const txt = block.join(' ');
        if (txt.includes('Sabine')) days.add(currentDay);
      }
      currentDay = null;
      block = [];
    };

    for (const line of lines) {
      const m = line.match(dayHeader);
      if (m) {
        flush();
        currentDay = parseInt(m[1], 10);
        block.push(line);
      } else if (currentDay !== null) {
        block.push(line);
      }
    }
    flush();

    return Array.from(days).sort((a, b) => a - b);
  } catch (err) {
    throw new PdfParseError(`pdf-parse failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function extractDaysWithSabine(pdfBuffer: Buffer): Promise<number[]> {
  // Eerst pdfjs (positioneel), bij error netjes terugvallen op pdf-parse (plain text)
  try {
    return await extractWithPdfJs(pdfBuffer);
  } catch {
    return await extractWithPdfParse(pdfBuffer);
  }
}
