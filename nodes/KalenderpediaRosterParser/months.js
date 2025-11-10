"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MONTH_ALTERNATION = void 0;
exports.normalizeMonth = normalizeMonth;
exports.getMonthNumber = getMonthNumber;
const MONTHS = {
    'januar': { key: 'januar', mm: '01' },
    'februar': { key: 'februar', mm: '02' },
    'märz': { key: 'märz', mm: '03' },
    'maerz': { key: 'märz', mm: '03' },
    'april': { key: 'april', mm: '04' },
    'mai': { key: 'mai', mm: '05' },
    'juni': { key: 'juni', mm: '06' },
    'juli': { key: 'juli', mm: '07' },
    'august': { key: 'august', mm: '08' },
    'september': { key: 'september', mm: '09' },
    'sept': { key: 'september', mm: '09' },
    'oktober': { key: 'oktober', mm: '10' },
    'november': { key: 'november', mm: '11' },
    'dezember': { key: 'dezember', mm: '12' },
};
// Alternation voor regex (incl. aliasen)
exports.MONTH_ALTERNATION = '(januar|februar|märz|maerz|april|mai|juni|juli|august|september|sept|oktober|november|dezember)';
function normalizeMonth(input) {
    const k = (input || '').toLowerCase();
    if (k in MONTHS)
        return MONTHS[k].key;
    // kleine normalisaties
    if (k === 'maerz')
        return 'märz';
    if (k === 'sept')
        return 'september';
    return k;
}
function getMonthNumber(norm) {
    const k = normalizeMonth(norm);
    return MONTHS[k]?.mm ?? null;
}
//# sourceMappingURL=months.js.map