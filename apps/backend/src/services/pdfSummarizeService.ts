import {ChatOpenAI} from "@langchain/openai";
import {z} from "zod";
import {qwenConfig} from "../config/qwen.js";
import chatpdfDocumentService from "./chatpdfDocumentService.js";
import {excerptMatchesPageText, normalizePdfText} from "./pdfTextNormalize.js";
import {
    PDF_CITATION_EXCERPT_MAX,
    PDF_CITATION_EXCERPT_MIN,
    PDF_SUMMARY_BULLET_MAX,
    PDF_SUMMARY_BULLET_MIN,
    PDF_SUMMARY_CITE_IDS_MAX,
    PDF_SUMMARY_MAX_INPUT_CHARS,
} from "./serviceConstants.js";
import type {PdfBullet, PdfCitation, PdfSummaryPayload} from "./chatpdfTypes.js";

const SummarizeSchema = z.object({
    bullets: z
        .array(
            z.object({
                text: z.string().min(1),
                citeIds: z.array(z.number().int().positive()).min(1).max(PDF_SUMMARY_CITE_IDS_MAX),
            })
        )
        .min(PDF_SUMMARY_BULLET_MIN)
        .max(PDF_SUMMARY_BULLET_MAX),
    citations: z
        .array(
            z.object({
                id: z.number().int().positive(),
                page: z.number().int().positive(),
                excerpt: z.string().min(PDF_CITATION_EXCERPT_MIN).max(PDF_CITATION_EXCERPT_MAX),
            })
        )
        .min(1),
});

function buildPageContext(pages: {page_number: number; text: string}[]): string {
    let ctx = pages.map((p) => `【第${p.page_number}页】\n${p.text}`).join("\n\n");
    if (ctx.length > PDF_SUMMARY_MAX_INPUT_CHARS) {
        ctx = ctx.slice(0, PDF_SUMMARY_MAX_INPUT_CHARS) + "\n\n…（后文已截断）";
    }
    return ctx;
}

function sanitizeSummary(
    raw: z.infer<typeof SummarizeSchema>,
    pageCount: number,
    pageTextByNum: Map<number, string>
): PdfSummaryPayload {
    const citationMap = new Map<number, PdfCitation>();
    for (const c of raw.citations) {
        if (c.page < 1 || c.page > pageCount) continue;
        const pageText = pageTextByNum.get(c.page) ?? "";
        if (!excerptMatchesPageText(c.excerpt, pageText)) continue;
        citationMap.set(c.id, {
            id: c.id,
            page: c.page,
            excerpt: normalizePdfText(c.excerpt),
        });
    }

    const bullets: PdfBullet[] = [];
    for (const b of raw.bullets) {
        const citeIds = b.citeIds.filter((id) => citationMap.has(id));
        if (!citeIds.length) continue;
        bullets.push({text: b.text.trim(), citeIds});
    }

    const citations = [...citationMap.values()].sort((a, b) => a.id - b.id);
    if (!bullets.length || !citations.length) {
        throw new Error("无法生成带有效引用的总结，请确认 PDF 含可提取文本");
    }
    return {bullets, citations};
}

class PdfSummarizeService {
    async summarizeDocument(documentId: number, userId: number): Promise<PdfSummaryPayload> {
        const doc = await chatpdfDocumentService.getOwnedChatPdf(userId, documentId);
        if (!doc) throw new Error("文档不存在");
        if (doc.parse_status !== "ready" || !doc.page_count) {
            throw new Error("文档尚未完成解析");
        }

        const pages = await chatpdfDocumentService.getPages(documentId, userId);
        if (!pages.length) throw new Error("无分页文本");

        const pageTextByNum = new Map(pages.map((p) => [p.page_number, p.text]));
        const context = buildPageContext(pages);

        const llm = new ChatOpenAI({
            apiKey: qwenConfig.apiKey,
            configuration: {baseURL: qwenConfig.baseURL},
            model: qwenConfig.chatModel,
            temperature: 0.2,
        }).withStructuredOutput(SummarizeSchema);

        const raw = await llm.invoke([
            {
                role: "system",
                content:
                    "你是 PDF 文档分析助手。根据分页全文生成分点总结（中文）。" +
                    "citations 中 excerpt 必须是原文连续子串；id 从 1 递增；bullets 的 citeIds 引用 citations.id。",
            },
            {
                role: "user",
                content: `【分页全文】\n${context}\n\n请输出结构化总结。`,
            },
        ]);

        const payload = sanitizeSummary(raw, doc.page_count, pageTextByNum);
        await chatpdfDocumentService.saveSummary(documentId, userId, payload);
        return payload;
    }
}

export default new PdfSummarizeService();
