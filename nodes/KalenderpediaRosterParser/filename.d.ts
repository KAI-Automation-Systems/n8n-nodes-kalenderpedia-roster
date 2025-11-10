export interface ParsedFilename {
    client: string;
    month: string;
    year: string;
    invoiceNumber: string;
    date: string;
}
export declare class FilenameParseError extends Error {
    constructor(filename: string);
}
export declare function parseRosterFilename(fileName: string): ParsedFilename;
//# sourceMappingURL=filename.d.ts.map