import fs from "fs/promises";
import {getDocument} from "pdfjs-dist/legacy/build/pdf.mjs";
import {CHATPDF_MAX_PAGES} from "./serviceConstants.js";
import type {DocumentPageRow} from "./chatpdfTypes.js";

type PdfTextItem = {str?: string};

type PdfDoc = Awaited<Awaited<ReturnType<typeof getDocument>>["promise"]>;
type PdfPage = Awaited<ReturnType<PdfDoc["getPage"]>>;

async function extractPageText(page: PdfPage): Promise<string> {
    const content = await page.getTextContent();
    const parts: string[] = [];
    for (const item of content.items as PdfTextItem[]) {
        if (typeof item.str === "string" && item.str) parts.push(item.str);
    }
    return parts.join(" ").replace(/\s+/g, " ").trim();
}

export async function parsePdfFileToPages(filePath: string): Promise<{
    pageCount: number;
    pages: DocumentPageRow[];
    fullText: string;
}> {
    const buffer = await fs.readFile(filePath);
    const loadingTask = getDocument({data: new Uint8Array(buffer), useSystemFonts: true});
    const doc = await loadingTask.promise;
    const pageCount = doc.numPages;
    if (pageCount > CHATPDF_MAX_PAGES) {
        throw new Error(`PDF 页数超过上限（${CHATPDF_MAX_PAGES} 页）`);
    }
    if (pageCount < 1) {
        throw new Error("PDF 无有效页面");
    }

    const pages: DocumentPageRow[] = [];
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
        const page = await doc.getPage(pageNumber);
        const text = await extractPageText(page);
        pages.push({page_number: pageNumber, text});
    }

    const fullText = pages.map((p) => p.text).filter(Boolean).join("\n\n");
    if (!fullText.trim()) {
        throw new Error("PDF 中未提取到文本（可能为扫描件，需 OCR）");
    }

    return {pageCount, pages, fullText};
}
