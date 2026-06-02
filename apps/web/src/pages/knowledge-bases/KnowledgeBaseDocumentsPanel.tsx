import {Empty, Space, message} from "antd";
import ChunkUploadModal from "@/components/ChunkUploadModal.tsx";
import {type KnowledgeBase} from "@/service/knowledgeBaseApi.ts";
import {useKnowledgeBaseDocuments} from "@/hooks/useKnowledgeBaseDocuments.ts";
import PendingUploadAlerts from "@/pages/knowledge-bases/PendingUploadAlerts.tsx";
import KnowledgeBaseDocumentsTable from "@/pages/knowledge-bases/KnowledgeBaseDocumentsTable.tsx";
import KnowledgeBaseFileUpload from "@/pages/knowledge-bases/KnowledgeBaseFileUpload.tsx";
import {useResumeUploadInput} from "@/pages/knowledge-bases/useResumeUploadInput.ts";

type KnowledgeBaseDocumentsPanelProps = {
    selectedKb: KnowledgeBase | null;
};

export default function KnowledgeBaseDocumentsPanel({selectedKb}: KnowledgeBaseDocumentsPanelProps) {
    const kbId = selectedKb?.id ?? null;
    const docsState = useKnowledgeBaseDocuments(kbId);
    const {resumeInputRef, onResumeFileChange} = useResumeUploadInput(
        docsState.consumeResumePending,
        docsState.resumePendingUpload
    );

    if (!selectedKb) {
        return <Empty description="请先在左侧选择一个知识库" />;
    }

    const onDeleteDoc = async (doc: Parameters<typeof docsState.removeDocument>[0]) => {
        try {
            await docsState.removeDocument(doc);
            message.success("已删除文档");
        } catch (e) {
            message.error(e instanceof Error ? e.message : "删除失败");
        }
    };

    return (
        <>
            <Space direction="vertical" style={{width: "100%"}} size="middle">
                <KnowledgeBaseFileUpload onUpload={docsState.uploadFile} />
                <PendingUploadAlerts
                    pendingUploads={docsState.pendingUploads}
                    onResume={(p) => {
                        docsState.prepareResumeUpload(p);
                        resumeInputRef.current?.click();
                    }}
                    onAbandon={(fileId) => {
                        void docsState.abandonPendingUpload(fileId)
                            .then(() => message.success("已取消未完成上传"))
                            .catch((e) => message.error(e instanceof Error ? e.message : "操作失败"));
                    }}
                />
                <input
                    ref={resumeInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.md"
                    style={{display: "none"}}
                    onChange={onResumeFileChange}
                />
                <KnowledgeBaseDocumentsTable
                    docs={docsState.docs}
                    loading={docsState.loading}
                    onDelete={onDeleteDoc}
                />
            </Space>
            <ChunkUploadModal
                open={docsState.chunkUpload.open}
                fileName={docsState.chunkUpload.fileName}
                snapshot={docsState.chunkUpload.snapshot}
                task={docsState.chunkUpload.task}
                onClose={docsState.closeChunkModal}
            />
        </>
    );
}
