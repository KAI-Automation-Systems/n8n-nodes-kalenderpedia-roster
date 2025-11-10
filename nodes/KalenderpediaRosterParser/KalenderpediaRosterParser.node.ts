// nodes/KalenderpediaRosterParser/KalenderpediaRosterParser.node.ts
import type {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';

import { parseRosterFilename, FilenameParseError } from './filename';
import { extractDaysWithSabine, PdfParseError } from './pdf';


export class KalenderpediaRosterParser implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Kalenderpedia Roster Parser',
    name: 'kalenderpediaRosterParser',
    group: ['transform'],
    version: 1,
    description: 'Parses Kalenderpedia roster PDFs to extract days with "Sabine"',
    defaults: { name: 'Kalenderpedia Roster Parser' },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'File Name Override',
        name: 'fileNameOverride',
        type: 'string',
        default: '',
        description: 'Optional filename if binary filename is missing',
        placeholder: 'CustomerD-mai-2025-querformat.pdf',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const inputItems = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (let i = 0; i < inputItems.length; i++) {
      // 1) Pak binary
      const bin = inputItems[i].binary;
      if (!bin) {
        throw new Error('Binary data missing. Expected a PDF in item.binary.*');
      }
      const binKey = Object.keys(bin)[0];
      if (!binKey) {
        throw new Error('Binary key missing. Expected item.binary.<key>');
      }
      const binaryItem = bin[binKey];

      // 2) Filename bepalen
      const fileNameOverride = this.getNodeParameter('fileNameOverride', i, '') as string;
      let fileName = (binaryItem.fileName ?? '').toString().trim();
      if (!fileName && fileNameOverride) fileName = fileNameOverride.trim();
      if (!fileName) {
        throw new Error('Filename missing. Provide it in binary or set File Name Override.');
      }

      // 3) PDF buffer (base64)
      const base64 = (binaryItem.data ?? '').toString();
      if (!base64) throw new Error('Binary data empty. Expected base64 PDF at binary.<key>.data');
      const cleaned = base64.includes(',') ? base64.split(',')[1] : base64;
      const pdfBuffer = Buffer.from(cleaned, 'base64');

      // 4) Filename parsing
      let parsed: {
        client: string;
        month: string;
        year: string;
        invoiceNumber: string;
        date: string; // YYYY-MM
      };
      try {
        parsed = parseRosterFilename(fileName);
      } catch (e) {
        if (e instanceof FilenameParseError) throw e;
        throw new FilenameParseError(fileName);
      }

      // 5) PDF uitlezen
      let dayNumbers: number[];
      try {
        dayNumbers = await extractDaysWithSabine(pdfBuffer);
      } catch (e) {
        if (e instanceof PdfParseError) throw e;
        throw new PdfParseError(`PDF parsing failed: ${e instanceof Error ? e.message : String(e)}`);
      }

      // 6) Output structureren (ongewijzigde functionaliteit)
      const { client, invoiceNumber, date } = parsed;
      const items = dayNumbers.map((d) => ({
        description: client,
        quantity: d,
      }));

      returnData.push({
        json: {
          invoiceNumber,
          date,
          data: { items },
        },
      });
    }

    return [returnData];
  }
}
