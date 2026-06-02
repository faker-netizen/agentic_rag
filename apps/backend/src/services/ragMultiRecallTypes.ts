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
    recallPerPath?: number;
    finalK?: number;
    minVectorScore?: number;
    paths?: RecallPathId[];
    fusion?: MultiRecallFusion;
    pathWeights?: Partial<Record<RecallPathId, number>>;
    debug?: boolean;
};

export type MultiRecallMeta = {
    fusion: MultiRecallFusion;
    pathTopIds: Record<string, number[]>;
    byPath?: Record<string, MultiRecallChunk[]>;
};

export type MultiRecallResult = {
    chunks: MultiRecallChunk[];
    meta: MultiRecallMeta;
};
