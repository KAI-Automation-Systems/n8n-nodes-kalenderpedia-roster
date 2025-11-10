"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilenameParseError = void 0;
exports.parseRosterFilename = parseRosterFilename;
const months_1 = require("./months");
class FilenameParseError extends Error {
    constructor(filename) {
        super(`Failed to parse filename: ${filename}`);
        this.name = 'FilenameParseError';
    }
}
exports.FilenameParseError = FilenameParseError;
function parseRosterFilename(fileName) {
    if (!fileName) {
        throw new FilenameParseError('Empty filename');
    }
    // Strip .pdf voor downstream gebruik maar bewaar originele casing/tekens
    const invoiceNumber = fileName.replace(/\.pdf$/i, '');
    const original = invoiceNumber; // zonder .pdf
    const normalized = original.replace(/_/g, ' ').toLowerCase();
    // Pattern 1: client[spacer]month[year] (zonder separator tussen maand en jaar)
    const pattern1 = new RegExp(`^(?<client>.+?)[\\s.\\-]*?(?<month>${months_1.MONTH_ALTERNATION})(?<year>\\d{4})`, 'i');
    // Pattern 2: client[spacer]month[spacer]year
    const pattern2 = new RegExp(`^(?<client>.+?)[\\s.\\-]*?(?<month>${months_1.MONTH_ALTERNATION})[\\s.\\-]+(?<year>\\d{4})`, 'i');
    const m = normalized.match(pattern1) || normalized.match(pattern2);
    if (!m || !m.groups)
        throw new FilenameParseError(fileName);
    const { month, year } = m.groups;
    // Vind beginindex van de maand in de originele string (zonder .pdf)
    const originalLower = original.toLowerCase();
    const monthNorm = (0, months_1.normalizeMonth)(month);
    let monthIndex = originalLower.indexOf(monthNorm);
    // Fallbacks voor varianten
    if (monthIndex === -1) {
        if (monthNorm === 'märz') {
            monthIndex = originalLower.indexOf('märz');
            if (monthIndex === -1)
                monthIndex = originalLower.indexOf('maerz');
        }
        else if (monthNorm === 'september') {
            monthIndex = originalLower.indexOf('september');
            if (monthIndex === -1)
                monthIndex = originalLower.indexOf('sept');
        }
    }
    if (monthIndex === -1)
        throw new FilenameParseError(fileName);
    // Client = alles vóór de maand, trailing separators eraf
    const clientOriginal = original.substring(0, monthIndex).trim();
    const clientTrimmed = clientOriginal.replace(/[\s.\-]+$/, '');
    const monthNum = (0, months_1.getMonthNumber)(monthNorm);
    if (!monthNum)
        throw new FilenameParseError(fileName);
    const date = `${year}-${monthNum}`;
    return {
        client: clientTrimmed || 'Unknown',
        month: monthNorm,
        year,
        invoiceNumber,
        date,
    };
}
//# sourceMappingURL=filename.js.map