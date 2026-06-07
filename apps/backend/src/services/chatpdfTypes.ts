export const DOCUMENT_ORIGIN_KB = "knowledge_base" as const;
export const DOCUMENT_ORIGIN_CHATPDF = "chatpdf" as const;

export type DocumentOrigin = typeof DOCUMENT_ORIGIN_KB | typeof DOCUMENT_ORIGIN_CHATPDF;

export type PdfCitation = {
    id: number;
    page: number;
    excerpt: string;
};

export type PdfBullet = {
    text: string;
    citeIds: number[];
};

export type PdfSummaryPayload = {
    bullets: PdfBullet[];
    citations: PdfCitation[];
};

export type ChatPdfDocumentRow = {
    id: number;
    user_id: number;
    title: string;
    file_path: string | null;
    file_type: string | null;
    page_count: number | null;
    parse_status: string;
    created_at: Date;
    updated_at: Date;
};

export type DocumentPageRow = {
    page_number: number;
    text: string;
};
