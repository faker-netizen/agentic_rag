import {Button, Empty, Popconfirm, Spin} from "antd";
import {DeleteOutlined, FileOutlined} from "@ant-design/icons";
import type {KnowledgeBaseDocument} from "@/service/knowledgeBaseApi.ts";
import {fileTypeLabel, formatDate} from "@/pages/knowledge-bases/finderUtils.ts";

type KnowledgeBaseDocumentListProps = {
    docs: KnowledgeBaseDocument[];
    loading: boolean;
    error: string | null;
    onDelete: (doc: KnowledgeBaseDocument) => void;
};

export default function KnowledgeBaseDocumentList({
    docs,
    loading,
    error,
    onDelete,
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
    );
}
