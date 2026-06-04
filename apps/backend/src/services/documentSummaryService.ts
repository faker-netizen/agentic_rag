import {HumanMessage, SystemMessage} from "@langchain/core/messages";
import {createLLM} from "./ragServiceHelpers.js";
import {
    DOCUMENT_SUMMARY_MAX_INPUT_CHARS,
    DOCUMENT_SUMMARY_MAX_OUTPUT_CHARS,
} from "./serviceConstants.js";

const SUMMARY_SYSTEM = `你是文档摘要助手。根据【文档全文】生成简洁中文摘要：
- 一段概述（2～4 句）
- 可选 3～5 条 bullet 关键信息
- 不要编造文中不存在的内容
- 总长度不超过 ${DOCUMENT_SUMMARY_MAX_OUTPUT_CHARS} 字`;

function truncateInput(text: string): string {
    const t = text.trim();
    if (t.length <= DOCUMENT_SUMMARY_MAX_INPUT_CHARS) return t;
    return t.slice(0, DOCUMENT_SUMMARY_MAX_INPUT_CHARS);
}

class DocumentSummaryService {
    async generateSummary(content: string, title: string): Promise<string> {
        const llm = createLLM();
        const body = truncateInput(content);
        const res = await llm.invoke([
            new SystemMessage(SUMMARY_SYSTEM),
            new HumanMessage(`【标题】${title}\n\n【文档全文】\n${body}`),
        ]);
        const raw = res.content;
        const text = typeof raw === "string" ? raw : "";
        const out = text.trim();
        if (!out) throw new Error("摘要生成为空");
        if (out.length > DOCUMENT_SUMMARY_MAX_OUTPUT_CHARS * 2) {
            return out.slice(0, DOCUMENT_SUMMARY_MAX_OUTPUT_CHARS * 2);
        }
        return out;
    }
}

export default new DocumentSummaryService();
