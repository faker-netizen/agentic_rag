import documentService from "../services/documentService.js";

export type RagSourceRef = {id: number; title: string};

/** 根据检索 chunk 解析可展示的引用来源（去重 documentId） */
export async function resolveSourcesFromChunks(
    chunks: Array<{metadata: {documentId: number}}>,
    userId: number,
    knowledgeBaseId: number
): Promise<RagSourceRef[]> {
    if (!chunks.length) return [];

    const sourceIds = [...new Set(chunks.map((c) => c.metadata.documentId))];
    const sources: RagSourceRef[] = [];

    for (const docId of sourceIds) {
        const doc = await documentService.getDocumentScoped(docId, userId, knowledgeBaseId);
        if (doc?.id != null) {
            sources.push({id: doc.id, title: doc.title});
        }
    }

    return sources;
}
