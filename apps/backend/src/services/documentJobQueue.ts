import documentService from "./documentService.js";
import documentSummaryService from "./documentSummaryService.js";
import ragService from "./ragService.js";

type JobKind = "summarize" | "index";

type DocumentJob = {
    kind: JobKind;
    userId: number;
    knowledgeBaseId: number;
    documentId: number;
};

const queue: DocumentJob[] = [];
let draining = false;

async function runSummarizeJob(job: DocumentJob): Promise<void> {
    const doc = await documentService.getDocumentScoped(
        job.documentId,
        job.userId,
        job.knowledgeBaseId
    );
    if (!doc?.content?.trim()) {
        await documentService.markSummaryFailed(job.documentId, job.userId, job.knowledgeBaseId);
        return;
    }
    try {
        const summary = await documentSummaryService.generateSummary(doc.content, doc.title);
        await documentService.markSummaryReady(
            job.documentId,
            job.userId,
            job.knowledgeBaseId,
            summary
        );
    } catch (e) {
        console.error("[documentJob] summarize failed:", e);
        await documentService.markSummaryFailed(job.documentId, job.userId, job.knowledgeBaseId);
    }
}

async function runIndexJob(job: DocumentJob): Promise<void> {
    const doc = await documentService.getDocumentScoped(
        job.documentId,
        job.userId,
        job.knowledgeBaseId
    );
    if (!doc?.content?.trim()) {
        await documentService.markIndexingFailed(job.documentId, job.userId, job.knowledgeBaseId);
        return;
    }
    try {
        await ragService.deleteEmbeddingsForDocument(job.documentId);
        await ragService.ingestDocument({
            text: doc.content,
            documentId: job.documentId,
            title: doc.title,
            source: doc.file_path ?? `document_${job.documentId}`,
        });
        await documentService.markIndexingReady(job.documentId, job.userId, job.knowledgeBaseId);
    } catch (e) {
        console.error("[documentJob] index failed:", e);
        await documentService.markIndexingFailed(job.documentId, job.userId, job.knowledgeBaseId);
    }
}

async function drainQueue(): Promise<void> {
    if (draining) return;
    draining = true;
    try {
        while (queue.length > 0) {
            const job = queue.shift();
            if (!job) break;
            if (job.kind === "summarize") await runSummarizeJob(job);
            else await runIndexJob(job);
        }
    } finally {
        draining = false;
    }
}

function enqueue(job: DocumentJob): void {
    queue.push(job);
    void drainQueue();
}

export function enqueueSummarize(userId: number, knowledgeBaseId: number, documentId: number): void {
    enqueue({kind: "summarize", userId, knowledgeBaseId, documentId});
}

export function enqueueIndex(userId: number, knowledgeBaseId: number, documentId: number): void {
    enqueue({kind: "index", userId, knowledgeBaseId, documentId});
}
