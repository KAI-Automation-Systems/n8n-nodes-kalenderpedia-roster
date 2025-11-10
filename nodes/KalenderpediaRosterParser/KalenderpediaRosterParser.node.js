"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KalenderpediaRosterParser = void 0;
// nodes/KalenderpediaRosterParser/KalenderpediaRosterParser.node.ts
const n8n_core_1 = require("n8n-core");
const n8n_workflow_1 = require("n8n-workflow");
const filename_1 = require("./filename");
const pdf_1 = require("./pdf");
class KalenderpediaRosterParser {
    description = {
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
    async execute() {
        const inputItems = this.getInputData();
        const returnData = [];
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
            const fileNameOverride = this.getNodeParameter('fileNameOverride', i, '');
            let fileName = (binaryItem.fileName ?? '').toString().trim();
            if (!fileName && fileNameOverride)
                fileName = fileNameOverride.trim();
            if (!fileName) {
                throw new Error('Filename missing. Provide it in binary or set File Name Override.');
            }
            // 3) PDF buffer (base64)
            const base64 = (binaryItem.data ?? '').toString();
            if (!base64)
                throw new Error('Binary data empty. Expected base64 PDF at binary.<key>.data');
            const cleaned = base64.includes(',') ? base64.split(',')[1] : base64;
            const pdfBuffer = Buffer.from(cleaned, 'base64');
            // 4) Filename parsing
            const parsed = (() => {
                try {
                    return (0, filename_1.parseRosterFilename)(fileName);
                }
                catch (e) {
                    if (e instanceof filename_1.FilenameParseError)
                        throw e;
                    throw new filename_1.FilenameParseError(fileName);
                }
            })();
            // 5) PDF uitlezen
            const dayNumbers = await (async () => {
                try {
                    return await (0, pdf_1.extractDaysWithSabine)(pdfBuffer);
                }
                catch (e) {
                    if (e instanceof pdf_1.PdfParseError)
                        throw e;
                    throw new pdf_1.PdfParseError(`PDF parsing failed: ${e instanceof Error ? e.message : String(e)}`);
                }
            })();
        }
    }
}
exports.KalenderpediaRosterParser = KalenderpediaRosterParser;
//# sourceMappingURL=KalenderpediaRosterParser.node.js.map