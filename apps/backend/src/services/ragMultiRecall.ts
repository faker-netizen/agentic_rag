/**
 * 多路召回
 *
 * 向量 + 关键词 + 标题多路融合（RRF / weighted），供 LangGraph 检索子图 `ragRetrievalGraph` 调用。
 */
import pool from "../config/database.js";
import VectorIndex from "../config/vectorIndex.js";

/** 与 RagChunkItem 对齐，便于后续无缝接入 RAG 生成 */
export type MultiRecallChunk = {
    content: string;
    score: number;
    metadata: {documentId: number; embeddingId: number};
};

export type RecallPathId = "vector" | "keyword" | "title";

export type MultiRecallFusion = "rrf" | "weighted_sum";

export type MultiRecallOptions = {
    userId: number;
    knowledgeBaseId?: number;
    documentId?: number;
    /** 每一路各自保留的条数（参与融合前） */
    recallPerPath?: number;
    /** 融合后返回条数 */
    finalK?: number;
    /** 向量路最低余弦相似度，低于则该路不参与排序（仍可出现于其它路） */
    minVectorScore?: number;
    /** 启用的召回路，默认三路全开 */
    paths?: RecallPathId[];
    /** 融合策略：rrf 为倒数排名融合；weighted_sum 为各路分数归一后加权 */
    fusion?: MultiRecallFusion;
    /** weighted_sum 时各路权重，缺省为 vector 0.55 / keyword 0.30 / title 0.15 */
    pathWeights?: Partial<Record<RecallPathId, number>>;
    /** 为 true 时在 meta.byPath 中返回各路 Top 列表（仅调试用） */
    debug?: boolean;
};

export type MultiRecallMeta = {
    fusion: MultiRecallFusion;
    /** 各路实际参与融合的 embedding id 列表（截断至 recallPerPath） */
    pathTopIds: Record<string, number[]>;
    byPath?: Record<string, MultiRecallChunk[]>;
};

export type MultiRecallResult = {
    chunks: MultiRecallChunk[];
    meta: MultiRecallMeta;
};

type EmbeddingRow = {
    id: number;
    document_id: number;
    chunk_text: string;
    embedding: number[];
    title: string;
};

const RRF_K = 60;
//构建查询sql中的动态参数 因为knowledgeBaseId和documentId是可选
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
    return {where: parts.join(" AND "), args};
}

//从数据库中获取embedding rows
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

/** MySQL LIKE 通配符转义 */
function escapeLikePattern(s: string): string {
    return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/**
 * 从问句抽取用于关键词路的词项：英文词（>=2）+ 连续汉字二元组。
 */
export function extractKeywordTerms(query: string): string[] {
    const raw = query.trim().toLowerCase();
    const terms = new Set<string>();
    for (const w of raw.split(/[\s,.;:!?，。；：、""''（）()\[\]{}]+/u)) {
        if (w.length >= 2 && /[a-z0-9]/i.test(w)) terms.add(w);
    }
    const cjk = raw.replace(/[^\u4e00-\u9fff]/gu, "");
    for (let i = 0; i < cjk.length - 1; i++) {
        terms.add(cjk.slice(i, i + 2));
    }
    if (cjk.length === 1) terms.add(cjk);
    if (terms.size === 0 && raw.length > 0) {
        const compact = raw.replace(/\s+/g, "");
        if (compact.length >= 2) terms.add(compact.slice(0, 32));
    }
    return [...terms];
}

//关键词的出现比例分数
function keywordScore(chunkText: string, terms: string[]): number {
    if (!terms.length) return 0;
    const t = chunkText.toLowerCase();
    let hit = 0;
    for (const term of terms) {
        if (term && t.includes(term)) hit += 1;
    }
    return hit / terms.length;
}

//针对标题的关键词出现比例分数
function titleMatchScore(title: string, query: string): number {
    const a = title.trim().toLowerCase();
    const b = query.trim().toLowerCase();
    if (!a || !b) return 0;
    if (a.includes(b)) return 1;
    const terms = extractKeywordTerms(query);
    if (!terms.length) return 0;
    let hit = 0;
    for (const term of terms) {
        if (term.length >= 2 && a.includes(term)) hit += 1;
    }
    return hit / terms.length;
}
//把row信息转换成chunk结构
function rowToChunk(row: EmbeddingRow, score: number): MultiRecallChunk {
    return {
        content: row.chunk_text,
        score,
        metadata: {documentId: row.document_id, embeddingId: row.id},
    };
}
//根据scoreFn计算候选rows的分数
function rankByScoreDesc(
    rows: EmbeddingRow[],
    scoreFn: (row: EmbeddingRow) => number,
    topN: number
): MultiRecallChunk[] {
    const scored = rows
        .map((row) => ({row, s: scoreFn(row)}))
        .filter((x) => x.s > 0 && Number.isFinite(x.s))
        .sort((a, b) => b.s - a.s);
    const seen = new Set<number>();
    const out: MultiRecallChunk[] = [];
    for (const {row, s} of scored) {
        if (seen.has(row.id)) continue;
        seen.add(row.id);
        out.push(rowToChunk(row, s));
        if (out.length >= topN) break;
    }
    return out;
}
//向量相似计算rows分数
function vectorRanked(
    rows: EmbeddingRow[],
    queryVec: number[],
    minScore: number,
    topN: number
): MultiRecallChunk[] {
    const scored: {row: EmbeddingRow; s: number}[] = [];
    for (const row of rows) {
        const vec = row.embedding;
        if (!Array.isArray(vec) || vec.length !== queryVec.length) continue;
        const s = VectorIndex.cosineSimilarity(queryVec, vec);
        if (!Number.isFinite(s) || s < minScore) continue;
        scored.push({row, s});
    }
    scored.sort((a, b) => b.s - a.s);
    return scored.slice(0, topN).map(({row, s}) => rowToChunk(row, s));
}

function assignRanks(chunks: MultiRecallChunk[]): Map<number, number> {
    const m = new Map<number, number>();
    chunks.forEach((c, i) => m.set(c.metadata.embeddingId, i + 1));
    return m;
}
//rrf规则计算倒数排名分数
function rrfFuse(
    ranksByPath: Map<RecallPathId, Map<number, number>>,
    idToChunk: Map<number, MultiRecallChunk>,
    paths: RecallPathId[]
): Map<number, number> {
    const fused = new Map<number, number>();
    for (const id of idToChunk.keys()) {
        let s = 0;
        for (const p of paths) {
            const rm = ranksByPath.get(p);
            const r = rm?.get(id);
            if (r != null) s += 1 / (RRF_K + r);
        }
        fused.set(id, s);
    }
    return fused;
}
//基于权重的排名分数
function weightedSumFuse(
    chunksByPath: Record<RecallPathId, MultiRecallChunk[]>,
    paths: RecallPathId[],
    weights: Record<RecallPathId, number>
): Map<number, number> {
    const perIdScores = new Map<number, number[]>();
    const idToChunk = new Map<number, MultiRecallChunk>();

    for (const p of paths) {
        const list = chunksByPath[p] ?? [];
        if (!list.length) continue;
        const maxS = Math.max(...list.map((c) => c.score), 1e-9);
        for (const c of list) {
            const id = c.metadata.embeddingId;
            idToChunk.set(id, c);
            const norm = c.score / maxS;
            const w = weights[p] ?? 0;
            const arr = perIdScores.get(id) ?? [];
            arr.push(norm * w);
            perIdScores.set(id, arr);
        }
    }
    const fused = new Map<number, number>();
    for (const [id, parts] of perIdScores) {
        fused.set(id, parts.reduce((a, b) => a + b, 0));
    }
    return fused;
}
//默认加权系数
function defaultWeights(): Record<RecallPathId, number> {
    return {vector: 0.55, keyword: 0.3, title: 0.15};
}

/**
 * 多路召回 + 融合。默认从库中最多拉取 2000 条候选再在内存中打分（与现有单路策略同量级）。
 */
export async function multiRecallChunks(query: string, opts: MultiRecallOptions): Promise<MultiRecallResult> {
    const recallPerPath = opts.recallPerPath ?? 24;
    const finalK = opts.finalK ?? 8;
    const minVectorScore = opts.minVectorScore ?? 0.15;
    const paths: RecallPathId[] = opts.paths?.length ? opts.paths : ["vector", "keyword", "title"];
    const fusion = opts.fusion ?? "rrf";
    const candidateLimit = 2000;

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
        candidateLimit
    );

    const terms = extractKeywordTerms(query);

    const chunksByPath = {} as Record<RecallPathId, MultiRecallChunk[]>;
    const pathTopIds: Record<string, number[]> = {};

    if (paths.includes("vector")) {
        const [qv] = await VectorIndex.embedTexts([query]);
        const list =
            Array.isArray(qv) && qv.length > 0 && rows.length > 0
                ? vectorRanked(rows, qv, minVectorScore, recallPerPath)
                : [];
        chunksByPath.vector = list;
        pathTopIds.vector = list.map((c) => c.metadata.embeddingId);
    }

    if (paths.includes("keyword")) {
        const list = rankByScoreDesc(
            rows,
            (row) => keywordScore(row.chunk_text, terms),
            recallPerPath
        );
        chunksByPath.keyword = list;
        pathTopIds.keyword = list.map((c) => c.metadata.embeddingId);
    }

    if (paths.includes("title")) {
        const list = rankByScoreDesc(
            rows,
            (row) => titleMatchScore(row.title, query),
            recallPerPath
        );
        chunksByPath.title = list;
        pathTopIds.title = list.map((c) => c.metadata.embeddingId);
    }

    const idToChunk = new Map<number, MultiRecallChunk>();
    for (const p of paths) {
        for (const c of chunksByPath[p] ?? []) {
            if (!idToChunk.has(c.metadata.embeddingId)) idToChunk.set(c.metadata.embeddingId, c);
        }
    }

    let fusedScores = new Map<number, number>();

    if (fusion === "rrf") {
        const ranksByPath = new Map<RecallPathId, Map<number, number>>();
        for (const p of paths) {
            ranksByPath.set(p, assignRanks(chunksByPath[p] ?? []));
        }
        fusedScores = rrfFuse(ranksByPath, idToChunk, paths);
    } else {
        const w = {...defaultWeights(), ...opts.pathWeights};
        fusedScores = weightedSumFuse(chunksByPath, paths, w as Record<RecallPathId, number>);
    }

    const merged = [...idToChunk.entries()]
        .map(([id, chunk]) => ({id, chunk, fs: fusedScores.get(id) ?? 0}))
        .sort((a, b) => b.fs - a.fs)
        .slice(0, finalK)
        .map(({chunk, fs}) => ({...chunk, score: fs}));

    const meta: MultiRecallMeta = {
        fusion,
        pathTopIds,
        ...(opts.debug ? {byPath: chunksByPath} : {}),
    };

    return {chunks: merged, meta};
}

/**
 * 仅标题 SQL 命中（另一路标题召回思路）：文档标题 LIKE 查询子串，再取这些文档下的 chunk。
 * 与内存 title 路互补，可用于后续「先锁文档再向量」策略；当前默认未使用。
 */
export async function recallChunksByTitleSql(
    query: string,
    opts: Pick<MultiRecallOptions, "userId" | "knowledgeBaseId" | "documentId"> & {limit?: number}
): Promise<MultiRecallChunk[]> {
    const q = query.trim();
    if (!q) return [];
    const lim = opts.limit ?? 40;
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
    return list.map((row, i) => rowToChunk(row, 1 - i * 0.001));
}
