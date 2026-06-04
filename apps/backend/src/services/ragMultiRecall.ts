/**
 * 多路召回：向量 + 关键词 + 标题融合（RRF / weighted）。
 */
import pool from "../config/database.js";
import {
    EMBEDDING_CANDIDATE_LIMIT,
    KEYWORD_TERM_MAX_LEN,
    RAG_KEYWORD_TOP_K,
    RAG_SCORE_THRESHOLD,
    RAG_VECTOR_TOP_K,
    SQL_TITLE_RECALL_LIMIT,
} from "./serviceConstants.js";
import {buildRecallByPath, mergeRecallChunks, rowToChunkWithRankDecay} from "./ragMultiRecallFusion.js";
import type {EmbeddingRow} from "./ragMultiRecallFusion.js";
import {INDEXED_DOCUMENT_SQL} from "./documentTypes.js";
import type {
    MultiRecallChunk,
    MultiRecallOptions,
    MultiRecallResult,
    RecallPathId,
} from "./ragMultiRecallTypes.js";

export type {MultiRecallChunk, MultiRecallOptions, MultiRecallResult, RecallPathId} from "./ragMultiRecallTypes.js";

function buildScope(
    userId: number,
    knowledgeBaseId?: number,
    documentId?: number
): {where: string; args: unknown[]} {
    const args: unknown[] = [userId];
    const parts = ["d.user_id = ?"];
    if (knowledgeBaseId != null) {
        parts.push("d.knowledge_base_id = ?");
        args.push(knowledgeBaseId);
    }
    if (documentId != null && documentId > 0) {
        parts.push("e.document_id = ?");
        args.push(documentId);
    }
    parts.push(INDEXED_DOCUMENT_SQL);
    return {where: parts.join(" AND "), args};
}

async function fetchCandidates(
    userId: number,
    knowledgeBaseId: number | undefined,
    documentId: number | undefined,
    limit: number
): Promise<EmbeddingRow[]> {
    const {where, args} = buildScope(userId, knowledgeBaseId, documentId);
    const sql = `
        SELECT e.id, e.document_id, e.chunk_text, e.embedding, d.title
        FROM embeddings e
        INNER JOIN documents d ON d.id = e.document_id
        WHERE ${where}
        ORDER BY e.id DESC
        LIMIT ?
    `;
    const [rows] = await pool.query(sql, [...args, limit]);
    return rows as EmbeddingRow[];
}

function escapeLikePattern(s: string): string {
    return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export function extractKeywordTerms(query: string): string[] {
    const raw = query.trim().toLowerCase();
    const terms = new Set<string>();
    for (const w of raw.split(/[\s,.;:!?，。；：、""''（）()[\]{}]+/u)) {
        if (w.length >= 2 && /[a-z0-9]/i.test(w)) terms.add(w);
    }
    const cjk = raw.replace(/[^\u4e00-\u9fff]/gu, "");
    for (let i = 0; i < cjk.length - 1; i++) {
        terms.add(cjk.slice(i, i + 2));
    }
    if (cjk.length === 1) terms.add(cjk);
    if (terms.size === 0 && raw.length > 0) {
        const compact = raw.replace(/\s+/g, "");
        if (compact.length >= 2) terms.add(compact.slice(0, KEYWORD_TERM_MAX_LEN));
    }
    return [...terms];
}

export async function multiRecallChunks(query: string, opts: MultiRecallOptions): Promise<MultiRecallResult> {
    const recallPerPath = opts.recallPerPath ?? RAG_KEYWORD_TOP_K;
    const finalK = opts.finalK ?? RAG_VECTOR_TOP_K;
    const minVectorScore = opts.minVectorScore ?? RAG_SCORE_THRESHOLD;
    const paths: RecallPathId[] = opts.paths?.length ? opts.paths : ["vector", "keyword", "title"];
    const fusion = opts.fusion ?? "rrf";

    if (!query.trim() || opts.userId == null) {
        return {
            chunks: [],
            meta: {fusion, pathTopIds: {}, ...(opts.debug ? {byPath: {}} : {})},
        };
    }

    const rows = await fetchCandidates(
        opts.userId,
        opts.knowledgeBaseId,
        opts.documentId,
        EMBEDDING_CANDIDATE_LIMIT
    );
    const terms = extractKeywordTerms(query);
    const {chunksByPath, pathTopIds} = await buildRecallByPath({
        query,
        rows,
        paths,
        recallPerPath,
        minVectorScore,
        terms,
    });
    const merged = mergeRecallChunks({paths, chunksByPath, fusion, opts, finalK});

    return {
        chunks: merged,
        meta: {
            fusion,
            pathTopIds,
            ...(opts.debug ? {byPath: chunksByPath} : {}),
        },
    };
}

export async function recallChunksByTitleSql(
    query: string,
    opts: Pick<MultiRecallOptions, "userId" | "knowledgeBaseId" | "documentId"> & {limit?: number}
): Promise<MultiRecallChunk[]> {
    const q = query.trim();
    if (!q) return [];
    const lim = opts.limit ?? SQL_TITLE_RECALL_LIMIT;
    const pat = escapeLikePattern(q);
    const {where, args} = buildScope(opts.userId, opts.knowledgeBaseId, opts.documentId);
    const sql = `
        SELECT e.id, e.document_id, e.chunk_text, e.embedding, d.title
        FROM embeddings e
        INNER JOIN documents d ON d.id = e.document_id
        WHERE ${where} AND d.title LIKE ? ESCAPE '\\\\'
        ORDER BY e.id DESC
        LIMIT ?
    `;
    const likeArg = `%${pat}%`;
    const [rows] = await pool.query(sql, [...args, likeArg, lim]);
    const list = rows as EmbeddingRow[];
    return list.map((row, i) => rowToChunkWithRankDecay(row, i));
}
