import {PDF_EXCERPT_FUZZY_PREFIX_LEN} from "./serviceConstants.js";

/** 空白归一化，供 excerpt 校验与前端搜索对齐 */
export function normalizePdfText(text: string): string {    return text.replace(/\s+/g, " ").trim();
}

export function excerptMatchesPageText(excerpt: string, pageText: string): boolean {
    const e = normalizePdfText(excerpt);
    const p = normalizePdfText(pageText);
    if (!e || !p) return false;
    if (p.includes(e)) return true;
    if (e.length > PDF_EXCERPT_FUZZY_PREFIX_LEN) {
        return p.includes(e.slice(0, PDF_EXCERPT_FUZZY_PREFIX_LEN));
    }
    return false;
}
