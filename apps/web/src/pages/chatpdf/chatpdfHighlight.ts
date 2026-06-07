import {normalizePdfText} from "@/pages/chatpdf/chatpdfTextNormalize.ts";

export function tryHighlightExcerpt(container: HTMLElement | null, excerpt: string): boolean {
    if (!container || !excerpt.trim()) return false;
    const needle = normalizePdfText(excerpt);
    if (!needle) return false;

    const spans = container.querySelectorAll<HTMLElement>(".react-pdf__Page__textContent span");
    for (const span of spans) {
        const hay = normalizePdfText(span.textContent ?? "");
        if (!hay || !hay.includes(needle)) continue;
        span.classList.add("chatpdf-hl");
        span.scrollIntoView({block: "center", behavior: "smooth"});
        return true;
    }

    return false;
}

export function clearChatPdfHighlights(root: HTMLElement | null): void {
    root?.querySelectorAll(".chatpdf-hl").forEach((el) => el.classList.remove("chatpdf-hl"));
}
