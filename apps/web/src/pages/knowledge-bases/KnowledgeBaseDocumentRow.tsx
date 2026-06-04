import {Button, Popconfirm, Tag} from "antd";
import {DeleteOutlined, FileOutlined} from "@ant-design/icons";
import type {KnowledgeBaseDocument} from "@/service/knowledgeBaseApi.ts";
import {fileTypeLabel, formatDate} from "@/pages/knowledge-bases/finderUtils.ts";
import {
    indexingStatusLabel,
    isIndexingBusy,
    isSummaryBusy,
    summaryStatusLabel,
} from "@/pages/knowledge-bases/documentStatusLabels.ts";

type KnowledgeBaseDocumentRowProps = {
    doc: KnowledgeBaseDocument;
    onDelete: (doc: KnowledgeBaseDocument) => void;
    onSummarize: (doc: KnowledgeBaseDocument) => void;
    onIndex: (doc: KnowledgeBaseDocument) => void;
};

export default function KnowledgeBaseDocumentRow({
    doc,
    onDelete,
    onSummarize,
    onIndex,
}: KnowledgeBaseDocumentRowProps) {
    const summaryBusy = isSummaryBusy(doc.summary_status);
    const indexBusy = isIndexingBusy(doc.indexing_status);

    return (
        <li className="kb-finder__row">
            <div className="kb-finder__row-icon">
                <FileOutlined />
            </div>
            <div className="kb-finder__row-main">
                <span className="kb-finder__row-title">{doc.title}</span>
                <span className="kb-finder__row-meta">
                    {fileTypeLabel(doc.file_type)} · {formatDate(doc.created_at)}
                </span>
                <div className="kb-finder__row-tags">
                    <Tag color={doc.summary_status === "ready" ? "green" : "default"}>
                        {summaryStatusLabel(doc.summary_status)}
                    </Tag>
                    <Tag color={doc.indexing_status === "indexed" ? "blue" : "default"}>
                        {indexingStatusLabel(doc.indexing_status)}
                    </Tag>
                </div>
            </div>
            <div className="kb-finder__row-actions">
                <Button size="small" loading={summaryBusy} disabled={summaryBusy} onClick={() => onSummarize(doc)}>
                    生成摘要
                </Button>
                <Button size="small" loading={indexBusy} disabled={indexBusy} onClick={() => onIndex(doc)}>
                    建立检索
                </Button>
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
            </div>
        </li>
    );
}
