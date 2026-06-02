import {Button, Empty, Popconfirm, Table, Tag} from "antd";
import type {ColumnsType} from "antd/es/table";
import type {KnowledgeBaseDocument} from "@/service/knowledgeBaseApi.ts";

type KnowledgeBaseDocumentsTableProps = {
    docs: KnowledgeBaseDocument[];
    loading: boolean;
    onDelete: (doc: KnowledgeBaseDocument) => void;
};

export default function KnowledgeBaseDocumentsTable({
    docs,
    loading,
    onDelete,
}: KnowledgeBaseDocumentsTableProps) {
    const columns: ColumnsType<KnowledgeBaseDocument> = [
        {title: "标题", dataIndex: "title", ellipsis: true},
        {
            title: "类型",
            dataIndex: "file_type",
            width: 90,
            render: (t: string | null) => (t ? <Tag>{t}</Tag> : "—"),
        },
        {
            title: "创建时间",
            dataIndex: "created_at",
            width: 180,
            render: (t: string) => new Date(t).toLocaleString(),
        },
        {
            title: "",
            key: "docActions",
            width: 88,
            render: (_, row) => (
                <Popconfirm title="删除该文档？" onConfirm={() => void onDelete(row)}>
                    <Button type="link" danger size="small">
                        删除
                    </Button>
                </Popconfirm>
            ),
        },
    ];

    return (
        <Table<KnowledgeBaseDocument>
            size="small"
            rowKey="id"
            loading={loading}
            columns={columns}
            dataSource={docs}
            pagination={{pageSize: 10, showSizeChanger: true}}
            locale={{emptyText: <Empty description="该知识库暂无文档" />}}
        />
    );
}
