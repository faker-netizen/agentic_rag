import {Button, Empty, Popconfirm, Space, Table, Typography} from "antd";
import type {ColumnsType} from "antd/es/table";
import {DatabaseOutlined, DeleteOutlined, PlusOutlined} from "@ant-design/icons";
import type {KnowledgeBase} from "@/service/knowledgeBaseApi.ts";

const {Text} = Typography;

type KnowledgeBaseListCardProps = {
    kbs: KnowledgeBase[];
    loading: boolean;
    selectedKb: KnowledgeBase | null;
    onSelect: (kb: KnowledgeBase) => void;
    onDelete: (kb: KnowledgeBase) => void;
    onCreate: () => void;
};

export default function KnowledgeBaseListCard({
    kbs,
    loading,
    selectedKb,
    onSelect,
    onDelete,
    onCreate,
}: KnowledgeBaseListCardProps) {
    const columns: ColumnsType<KnowledgeBase> = [
        {
            title: "名称",
            dataIndex: "name",
            ellipsis: true,
            render: (name: string, row) => (
                <Space>
                    <DatabaseOutlined />
                    <Text strong={selectedKb?.id === row.id}>{name}</Text>
                </Space>
            ),
        },
        {
            title: "",
            key: "actions",
            width: 72,
            render: (_, row) => (
                <Popconfirm title="删除该知识库及其全部文档？" onConfirm={() => onDelete(row)}>
                    <Button type="link" danger size="small" icon={<DeleteOutlined />}>
                        删除
                    </Button>
                </Popconfirm>
            ),
        },
    ];

    return (
        <Table<KnowledgeBase>
            size="small"
            rowKey="id"
            loading={loading}
            columns={columns}
            dataSource={kbs}
            pagination={false}
            locale={{emptyText: <Empty description="暂无知识库，请先新建" />}}
            title={() => (
                <Space style={{width: "100%", justifyContent: "space-between"}}>
                    <span>知识库</span>
                    <Button type="primary" size="small" icon={<PlusOutlined />} onClick={onCreate}>
                        新建
                    </Button>
                </Space>
            )}
            onRow={(row) => ({
                onClick: () => onSelect(row),
                style: {
                    cursor: "pointer",
                    background: selectedKb?.id === row.id ? "rgba(22, 119, 255, 0.08)" : undefined,
                },
            })}
        />
    );
}
