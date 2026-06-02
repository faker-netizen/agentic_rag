import {useKnowledgeBaseChunkUpload} from "@/hooks/useKnowledgeBaseChunkUpload.ts";
import {useKnowledgeBaseDocList} from "@/hooks/useKnowledgeBaseDocList.ts";
import {usePendingChunkUploads} from "@/hooks/usePendingChunkUploads.ts";

export type {ChunkUploadState} from "@/hooks/knowledgeBaseUploadHelpers.ts";

export function useKnowledgeBaseDocuments(kbId: number | null) {
    const {docs, loading, error, refreshDocs, removeDocument} = useKnowledgeBaseDocList(kbId);
    const {pendingUploads, refreshPending, abandonPendingUpload} = usePendingChunkUploads(kbId);
    const chunk = useKnowledgeBaseChunkUpload(kbId, refreshDocs, refreshPending);

    return {
        docs,
        loading,
        error,
        pendingUploads,
        refreshDocs,
        removeDocument,
        abandonPendingUpload,
        ...chunk,
    };
}
