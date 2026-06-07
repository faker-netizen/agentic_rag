export function normalizePdfText(text: string): string {
    return text.replace(/\s+/g, " ").trim();
}
