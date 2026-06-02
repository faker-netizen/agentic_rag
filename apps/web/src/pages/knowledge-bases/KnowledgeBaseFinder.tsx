import {useRef} from "react";
import {
    Alert,
    Button,
    Empty,
    Popconfirm,
    Spin,
    Upload,
    message,
} from "antd";
import {
    DeleteOutlined,
    FileOutlined,
    FolderOpenOutlined,
    UploadOutlined,
} from "@ant-design/icons";
import ChunkUploadModal from "@/components/ChunkUploadModal.tsx";
import {useKnowledgeBaseDocuments} from "@/hooks/useKnowledgeBaseDocuments.ts";
import {useWindowContentMeta} from "@/desktop/windowContentContext.ts";
import type {KnowledgeBaseDocument} from "@/service/knowledgeBaseApi.ts";
import "./finder.css";

function fileTypeLabel(fileType: string | null | undefined): string {
    if (!fileType) return "文档";
    const t = fileType.toLowerCase();
    if (t.includes("pdf")) return "PDF";
    if (t.includes("doc")) return "Word";
    if (t.includes("md") || t.includes("markdown")) return "Markdown";
    if (t.includes("txt")) return "文本";
    return fileType.toUpperCase();
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleString(undefined, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default function KnowledgeBaseFinder() {
    const meta = useWindowContentMeta();
    const kbId = meta?.knowledgeBaseId ?? null;
    const resumeInputRef = useRef<HTMLInputElement>(null);

    const {
        docs,
        loading,
        error,
        pendingUploads,
        chunkUpload,
        uploadFile,
        removeDocument,
        resumePendingUpload,
        abandonPendingUpload,
        closeChunkModal,
        prepareResumeUpload,
        consumeResumePending,
    } = useKnowledgeBaseDocuments(kbId);

    if (kbId == null) {
        return (
            <div className="kb-finder kb-finder--empty">
                <Empty description="未指定知识库" />
            </div>
        );
    }

    const onUpload = async (file: File) => {
        try {
            await uploadFile(file);
            message.success("上传成功");
        } catch (e) {
            message.error(e instanceof Error ? e.message : "上传失败");
        }
    };

    const onDelete = async (doc: KnowledgeBaseDocument) => {
        try {
            await removeDocument(doc);
            message.success("已删除文档");
        } catch (e) {
            message.error(e instanceof Error ? e.message : "删除失败");
        }
    };

    return (
        <div className="kb-finder">
            <header className="kb-finder__toolbar">
                <div className="kb-finder__toolbar-start">
                    <FolderOpenOutlined className="kb-finder__toolbar-icon" />
                    <span className="kb-finder__toolbar-title">文档</span>
                    <span className="kb-finder__toolbar-count">{docs.length} 项</span>
                </div>
                <Upload
                    showUploadList={false}
                    accept=".pdf,.doc,.docx,.txt,.md"
                    beforeUpload={(file) => {
                        void onUpload(file);
                        return false;
                    }}
                >
                    <Button type="primary" size="small" icon={<UploadOutlined />} className="kb-finder__upload">
                        上传
                    </Button>
                </Upload>
            </header>

            {pendingUploads.length > 0 ? (
                <div className="kb-finder__alerts">
                    {pendingUploads.map((p) => (
                        <Alert
                            key={p.fileId}
                            type="warning"
                            showIcon
                            message={`未完成上传：${p.fileName}`}
                            description={`已保存 ${p.uploadedChunks}/${p.totalChunks} 个分片`}
                            action={
                                <div className="kb-finder__alert-actions">
                                    <Button
                                        size="small"
                                        type="primary"
                                        onClick={() => {
                                            prepareResumeUpload(p);
                                            resumeInputRef.current?.click();
                                        }}
                                    >
                                        继续
                                    </Button>
                                    <Button
                                        size="small"
                                        danger
                                        onClick={() => {
                                            void abandonPendingUpload(p.fileId)
                                                .then(() => message.success("已取消未完成上传"))
                                                .catch((e) =>
                                                    message.error(
                                                        e instanceof Error ? e.message : "操作失败"
                                                    )
                                                );
                                        }}
                                    >
                                        放弃
                                    </Button>
                                </div>
                            }
                        />
                    ))}
                </div>
            ) : null}

            <input
                ref={resumeInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt,.md"
                className="kb-finder__resume-input"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    const pending = consumeResumePending();
                    e.target.value = "";
                    if (!file || !pending) return;
                    void resumePendingUpload(file, pending)
                        .then(() => message.success("上传成功"))
                        .catch((err) =>
                            message.error(err instanceof Error ? err.message : "续传失败")
                        );
                }}
            />

            <div className="kb-finder__list-host">
                {loading ? (
                    <div className="kb-finder__loading">
                        <Spin />
                    </div>
                ) : error ? (
                    <div className="kb-finder__error">
                        <Empty description={error} />
                    </div>
                ) : docs.length === 0 ? (
                    <div className="kb-finder__empty">
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description="此知识库暂无文档，点击上传添加文件"
                        />
                    </div>
                ) : (
                    <ul className="kb-finder__list">
                        {docs.map((doc) => (
                            <li key={doc.id} className="kb-finder__row">
                                <div className="kb-finder__row-icon">
                                    <FileOutlined />
                                </div>
                                <div className="kb-finder__row-main">
                                    <span className="kb-finder__row-title">{doc.title}</span>
                                    <span className="kb-finder__row-meta">
                                        {fileTypeLabel(doc.file_type)} · {formatDate(doc.created_at)}
                                    </span>
                                </div>
                                <Popconfirm title="删除该文档？" onConfirm={() => onDelete(doc)}>
                                    <Button
                                        type="text"
                                        size="small"
                                        danger
                                        icon={<DeleteOutlined />}
                                        aria-label="删除"
                                        className="kb-finder__row-delete"
                                    />
                                </Popconfirm>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <ChunkUploadModal
                open={chunkUpload.open}
                fileName={chunkUpload.fileName}
                snapshot={chunkUpload.snapshot}
                task={chunkUpload.task}
                onClose={closeChunkModal}
            />
        </div>
    );
}
