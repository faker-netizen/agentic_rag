import VectorIndex from "../config/vectorIndex.js";
import {
    FLOAT_EPSILON,
    RANK_DECAY_STEP,
    RRF_FUSION_K,
} from "./serviceConstants.js";
import type {
    MultiRecallChunk,
    MultiRecallOptions,
    RecallPathId,
} from "./ragMultiRecallTypes.js";

export type EmbeddingRow = {
    id: number;
    document_id: number;
    chunk_text: string;
    embedding: number[];
    title: string;
};

function keywordScore(chunkText: string, terms: string[]): number {
    if (!terms.length) return 0;
    const t = chunkText.toLowerCase();
    let hit = 0;
    for (const term of terms) {
        if (term && t.includes(term)) hit += 1;
    }
    return hit / terms.length;
}

function titleMatchScore(title: string, query: string, terms: string[]): number {
    const a = title.trim().toLowerCase();
    const b = query.trim().toLowerCase();
    if (!a || !b) return 0;
    if (a.includes(b)) return 1;
    if (!terms.length) return 0;
    let hit = 0;
    for (const term of terms) {
        if (term.length >= 2 && a.includes(term)) hit += 1;
    }
    return hit / terms.length;
}

function rowToChunk(row: EmbeddingRow, score: number): MultiRecallChunk {
    return {
        content: row.chunk_text,
        score,
        metadata: {documentId: row.document_id, embeddingId: row.id},
    };
}

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
            if (r != null) s += 1 / (RRF_FUSION_K + r);
        }
        fused.set(id, s);
    }
    return fused;
}

function weightedSumFuse(
    chunksByPath: Record<RecallPathId, MultiRecallChunk[]>,
    paths: RecallPathId[],
    weights: Record<RecallPathId, number>
): Map<number, number> {
    const perIdScores = new Map<number, number[]>();

    for (const p of paths) {
        const list = chunksByPath[p] ?? [];
        if (!list.length) continue;
        const maxS = Math.max(...list.map((c) => c.score), FLOAT_EPSILON);
        for (const c of list) {
            const id = c.metadata.embeddingId;
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

function defaultWeights(): Record<RecallPathId, number> {
    return {vector: 0.55, keyword: 0.3, title: 0.15};
}

export type BuildRecallParams = {
    query: string;
    rows: EmbeddingRow[];
    paths: RecallPathId[];
    recallPerPath: number;
    minVectorScore: number;
    terms: string[];
};

export async function buildRecallByPath(
    params: BuildRecallParams
): Promise<{chunksByPath: Record<RecallPathId, MultiRecallChunk[]>; pathTopIds: Record<string, number[]>}> {
    const {query, rows, paths, recallPerPath, minVectorScore, terms} = params;
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
        const list = rankByScoreDesc(rows, (row) => keywordScore(row.chunk_text, terms), recallPerPath);
        chunksByPath.keyword = list;
        pathTopIds.keyword = list.map((c) => c.metadata.embeddingId);
    }

    if (paths.includes("title")) {
        const list = rankByScoreDesc(
            rows,
            (row) => titleMatchScore(row.title, query, terms),
            recallPerPath
        );
        chunksByPath.title = list;
        pathTopIds.title = list.map((c) => c.metadata.embeddingId);
    }

    return {chunksByPath, pathTopIds};
}

export type MergeRecallParams = {
    paths: RecallPathId[];
    chunksByPath: Record<RecallPathId, MultiRecallChunk[]>;
    fusion: MultiRecallOptions["fusion"];
    opts: MultiRecallOptions;
    finalK: number;
};

export function mergeRecallChunks(params: MergeRecallParams): MultiRecallChunk[] {
    const {paths, chunksByPath, fusion, opts, finalK} = params;
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

    return [...idToChunk.entries()]
        .map(([id, chunk]) => ({id, chunk, fs: fusedScores.get(id) ?? 0}))
        .sort((a, b) => b.fs - a.fs)
        .slice(0, finalK)
        .map(({chunk, fs}) => ({...chunk, score: fs}));
}

export function rowToChunkWithRankDecay(row: EmbeddingRow, index: number): MultiRecallChunk {
    return rowToChunk(row, 1 - index * RANK_DECAY_STEP);
}

export {rowToChunk, keywordScore, titleMatchScore};
