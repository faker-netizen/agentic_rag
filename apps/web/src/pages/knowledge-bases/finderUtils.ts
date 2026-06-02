export function fileTypeLabel(fileType: string | null | undefined): string {
    if (!fileType) return "文档";
    const t = fileType.toLowerCase();
    if (t.includes("pdf")) return "PDF";
    if (t.includes("doc")) return "Word";
    if (t.includes("md") || t.includes("markdown")) return "Markdown";
    if (t.includes("txt")) return "文本";
    return fileType.toUpperCase();
}

export function formatDate(iso: string): string {
    return new Date(iso).toLocaleString(undefined, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}
