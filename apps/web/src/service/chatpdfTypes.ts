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
