import {createRequire} from "node:module";
import fs from "fs/promises";
import path from "path";
import mammoth from "mammoth";

const require = createRequire(import.meta.url);
type PdfParseResult = {text?: string; numpages?: number};
const pdfParse = require("pdf-parse") as (data: Buffer) => Promise<PdfParseResult>;

export async function parsePdfFile(filePath: string): Promise<string> {
    const dataBuffer = await fs.readFile(filePath);
    let data: PdfParseResult;
    try {
        data = await pdfParse(dataBuffer);
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(`PDF 解析失败（可能已加密、损坏或版本过新）: ${msg}`);
    }
    const text = (data.text ?? "").trim();
    if (!text) {
        throw new Error(
            "PDF 中未提取到文本。若为扫描件（整页为图片），需先做 OCR；也可能是仅含图片/图层的版式文件。"
        );
    }
    return data.text ?? "";
}

export async function parseWordFile(filePath: string): Promise<string> {
    const dataBuffer = await fs.readFile(filePath);
    const result = await mammoth.extractRawText({buffer: dataBuffer});
    return result.value;
}

export async function parseTextFile(filePath: string): Promise<string> {
    return await fs.readFile(filePath, "utf-8");
}

export async function parseDocumentFile(filePath: string): Promise<string> {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === ".pdf") return parsePdfFile(filePath);
    if ([".doc", ".docx"].includes(ext)) return parseWordFile(filePath);
    if ([".txt", ".md"].includes(ext)) return parseTextFile(filePath);
    throw new Error(`不支持的文件类型: ${ext}`);
}
