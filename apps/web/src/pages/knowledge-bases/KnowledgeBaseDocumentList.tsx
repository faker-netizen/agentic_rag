import {Empty, Spin} from "antd";
import type {KnowledgeBaseDocument} from "@/service/knowledgeBaseApi.ts";
import KnowledgeBaseDocumentRow from "@/pages/knowledge-bases/KnowledgeBaseDocumentRow.tsx";

type KnowledgeBaseDocumentListProps = {
    docs: KnowledgeBaseDocument[];
    loading: boolean;
    error: string | null;
    onDelete: (doc: KnowledgeBaseDocument) => void;
    onSummarize: (doc: KnowledgeBaseDocument) => void;
    onIndex: (doc: KnowledgeBaseDocument) => void;
};

export default function KnowledgeBaseDocumentList({
    docs,
    loading,
    error,
    onDelete,
    onSummarize,
    onIndex,
}: KnowledgeBaseDocumentListProps) {
    if (loading) {
        return (
            <div className="kb-finder__loading">
                <Spin />
            </div>
        );
    }
    if (error) {
        return (
            <div className="kb-finder__error">
                <Empty description={error} />
            </div>
        );
    }
    if (docs.length === 0) {
        return (
            <div className="kb-finder__empty">
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="此知识库暂无文档，点击上传添加文件"
                />
            </div>
        );
    }

    return (
        <ul className="kb-finder__list">
            {docs.map((doc) => (
                <KnowledgeBaseDocumentRow
                    key={doc.id}
                    doc={doc}
                    onDelete={onDelete}
                    onSummarize={onSummarize}
                    onIndex={onIndex}
                />
            ))}
        </ul>
    );
}
