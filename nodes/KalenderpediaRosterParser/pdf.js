"use strict";
// nodes/KalenderpediaRosterParser/pdf.ts
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PdfParseError = void 0;
exports.extractDaysWithSabine = extractDaysWithSabine;
// Gebruik de legacy CommonJS build van pdfjs-dist (stabiel in Node/tsc commonjs)
const pdfjsLib = __importStar(require("pdfjs-dist/legacy/build/pdf.js"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
class PdfParseError extends Error {
    constructor(message) {
        super(message);
        this.name = 'PdfParseError';
    }
}
exports.PdfParseError = PdfParseError;
const COLUMN_TOLERANCE = 20; // px
// Worker instellen voor legacy build (CommonJS)
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const workerSrc = require('pdfjs-dist/legacy/build/pdf.worker.js');
    // Sommige bundlers geven een object terug; pak dan .default
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc.default || workerSrc;
}
catch {
    // Laat pdfjs zonder aparte worker draaien. In Node werkt dat meestal ook.
}
async function extractWithPdfJs(pdfBuffer) {
    try {
        const loadingTask = pdfjsLib.getDocument({
            data: pdfBuffer,
            isEvalSupported: false,
            // geen ongeldige opties zoals useSystemFonts
        });
        const pdf = await loadingTask.promise;
        const daysWithSabine = new Set();
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            const dayColumns = new Map();
            const textItems = [];
            // Items casten en (x,y) pakken uit transform
            for (const anyItem of textContent.items) {
                const s = String(anyItem.str ?? '').trim();
                const tf = (anyItem.transform ?? []);
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
                let closest = null;
                let min = Infinity;
                for (const col of dayColumns.values()) {
                    const d = Math.abs(it.x - col.xPosition);
                    if (d < COLUMN_TOLERANCE && d < min) {
                        min = d;
                        closest = col;
                    }
                }
                if (closest)
                    closest.textItems.push(it);
            }
            // "Sabine" in kolom => dag toevoegen
            for (const col of dayColumns.values()) {
                if (col.textItems.some(t => t.str.includes('Sabine'))) {
                    daysWithSabine.add(col.dayNumber);
                }
            }
        }
        return Array.from(daysWithSabine).sort((a, b) => a - b);
    }
    catch (err) {
        throw new PdfParseError(`pdfjs-dist failed: ${err instanceof Error ? err.message : String(err)}`);
    }
}
async function extractWithPdfParse(pdfBuffer) {
    try {
        const data = await (0, pdf_parse_1.default)(pdfBuffer);
        const lines = data.text.split(/\r?\n/).map(l => l.trim());
        const days = new Set();
        const dayHeader = /^([1-9]|[12][0-9]|3[01])\b/;
        let currentDay = null;
        let block = [];
        const flush = () => {
            if (currentDay !== null) {
                const txt = block.join(' ');
                if (txt.includes('Sabine'))
                    days.add(currentDay);
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
            }
            else if (currentDay !== null) {
                block.push(line);
            }
        }
        flush();
        return Array.from(days).sort((a, b) => a - b);
    }
    catch (err) {
        throw new PdfParseError(`pdf-parse failed: ${err instanceof Error ? err.message : String(err)}`);
    }
}
async function extractDaysWithSabine(pdfBuffer) {
    // Eerst pdfjs (positioneel), bij error netjes terugvallen op pdf-parse (plain text)
    try {
        return await extractWithPdfJs(pdfBuffer);
    }
    catch {
        return await extractWithPdfParse(pdfBuffer);
    }
}
//# sourceMappingURL=pdf.js.map