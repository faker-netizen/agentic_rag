import {Card, Table, Typography} from "antd";
import type {ColumnsType} from "antd/es/table";
import MarkdownContent from "@/components/MarkdownContent";
import type {RagSource} from "@/service/ragApi.ts";

const {Title} = Typography;

const sourceColumns: ColumnsType<RagSource> = [
    {title: "ID", dataIndex: "id", width: 80},
    {title: "标题", dataIndex: "title", ellipsis: true},
];

type RagResultCardProps = {
    answer: string;
    sources: RagSource[];
    submitting: boolean;
};

export default function RagResultCard({answer, sources, submitting}: RagResultCardProps) {
    if (!answer && sources.length === 0 && !submitting) return null;

    return (
        <Card title="结果">
            <MarkdownContent content={answer || (submitting ? "" : "")} />
            {submitting && !answer && (
                <Typography.Text type="secondary">生成中…</Typography.Text>
            )}
            {sources.length > 0 && (
                <>
                    <Title level={5}>引用片段</Title>
                    <Table
                        size="small"
                        rowKey="id"
                        columns={sourceColumns}
                        dataSource={sources}
                        pagination={false}
                    />
                </>
            )}
        </Card>
    );
}
