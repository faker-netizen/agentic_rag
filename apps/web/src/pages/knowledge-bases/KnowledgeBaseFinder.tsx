import {Empty, message} from "antd";
import ChunkUploadModal from "@/components/ChunkUploadModal.tsx";
import {useKnowledgeBaseDocuments} from "@/hooks/useKnowledgeBaseDocuments.ts";
import {useWindowContentMeta} from "@/desktop/windowContentContext.ts";
import type {KnowledgeBaseDocument} from "@/service/knowledgeBaseApi.ts";
import KnowledgeBaseFinderToolbar from "@/pages/knowledge-bases/KnowledgeBaseFinderToolbar.tsx";
import PendingUploadAlerts from "@/pages/knowledge-bases/PendingUploadAlerts.tsx";
import KnowledgeBaseDocumentList from "@/pages/knowledge-bases/KnowledgeBaseDocumentList.tsx";
import {useResumeUploadInput} from "@/pages/knowledge-bases/useResumeUploadInput.ts";
import "./finder.css";

export default function KnowledgeBaseFinder() {
    const meta = useWindowContentMeta();
    const kbId = meta?.knowledgeBaseId ?? null;

    const docState = useKnowledgeBaseDocuments(kbId);
    const {resumeInputRef, onResumeFileChange} = useResumeUploadInput(
        docState.consumeResumePending,
        docState.resumePendingUpload
    );

    if (kbId == null) {
        return (
            <div className="kb-finder kb-finder--empty">
                <Empty description="未指定知识库" />
            </div>
        );
    }

    const onUpload = async (file: File) => {
        try {
            await docState.uploadFile(file);
            message.success("上传成功");
        } catch (e) {
            message.error(e instanceof Error ? e.message : "上传失败");
        }
    };

    const onDelete = async (doc: KnowledgeBaseDocument) => {
        try {
            await docState.removeDocument(doc);
            message.success("已删除文档");
        } catch (e) {
            message.error(e instanceof Error ? e.message : "删除失败");
        }
    };

    return (
        <div className="kb-finder">
            <KnowledgeBaseFinderToolbar docCount={docState.docs.length} onUpload={onUpload} />
            <PendingUploadAlerts
                pendingUploads={docState.pendingUploads}
                onResume={(p) => {
                    docState.prepareResumeUpload(p);
                    resumeInputRef.current?.click();
                }}
                onAbandon={(fileId) => {
                    void docState.abandonPendingUpload(fileId)
                        .then(() => message.success("已取消未完成上传"))
                        .catch((e) => message.error(e instanceof Error ? e.message : "操作失败"));
                }}
            />
            <input
                ref={resumeInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt,.md"
                className="kb-finder__resume-input"
                onChange={onResumeFileChange}
            />
            <div className="kb-finder__list-host">
                <KnowledgeBaseDocumentList
                    docs={docState.docs}
                    loading={docState.loading}
                    error={docState.error}
                    onDelete={onDelete}
                />
            </div>
            <ChunkUploadModal
                open={docState.chunkUpload.open}
                fileName={docState.chunkUpload.fileName}
                snapshot={docState.chunkUpload.snapshot}
                task={docState.chunkUpload.task}
                onClose={docState.closeChunkModal}
            />
        </div>
    );
}
