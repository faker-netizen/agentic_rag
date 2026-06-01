import {useCallback, useEffect, useRef, useState} from "react";
import {Button, Card, Form, Input, Select, Space, Table, Typography, message} from "antd";
import type {ColumnsType} from "antd/es/table";
import {listKnowledgeBases, type KnowledgeBase} from "@/service/knowledgeBaseApi.ts";
import {streamRagQuery, type RagSource} from "@/service/ragApi.ts";
import {RequestError} from "@/service/request.ts";
import MarkdownContent from "@/components/MarkdownContent";

const {Title} = Typography;

function errMsg(e: unknown): string {
    return e instanceof RequestError ? e.message : "请求失败，请稍后重试";
}

const sourceColumns: ColumnsType<RagSource> = [
    {title: "ID", dataIndex: "id", width: 80},
    {title: "标题", dataIndex: "title", ellipsis: true},
];

export default function RagPage() {
    const abortRef = useRef<AbortController | null>(null);
    const [kbs, setKbs] = useState<KnowledgeBase[]>([]);
    const [loadingKbs, setLoadingKbs] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [answer, setAnswer] = useState("");
    const [sources, setSources] = useState<RagSource[]>([]);
    const [form] = Form.useForm<{knowledgeBaseId: number; query: string}>();

    const loadKbs = useCallback(async () => {
        setLoadingKbs(true);
        try {
            const list = await listKnowledgeBases();
            setKbs(list);
            const cur = form.getFieldValue("knowledgeBaseId");
            if (cur == null && list[0]) {
                form.setFieldValue("knowledgeBaseId", list[0].id);
            }
        } catch (e) {
            message.error(errMsg(e));
        } finally {
            setLoadingKbs(false);
        }
    }, [form]);

    useEffect(() => {
        void loadKbs();
    }, [loadKbs]);

    useEffect(() => {
        return () => abortRef.current?.abort();
    }, []);

    const onSubmit = async () => {
        try {
            await form.validateFields();
        } catch {
            return;
        }
        const {knowledgeBaseId, query} = form.getFieldsValue();
        abortRef.current?.abort();
        const ac = new AbortController();
        abortRef.current = ac;

        setSubmitting(true);
        setAnswer("");
        setSources([]);
        let streamText = "";

        try {
            await streamRagQuery(
                {query, knowledgeBaseId},
                {
                    onSources: ({sources: s}) => setSources(s),
                    onToken: ({text}) => {
                        streamText += text;
                        setAnswer(streamText);
                    },
                    onError: ({message: m}) => message.error(m),
                    onDone: ({answer: a, sources: s}) => {
                        setAnswer(a);
                        setSources(s);
                    },
                },
                {signal: ac.signal}
            );
        } catch (e) {
            if (!(e instanceof DOMException && e.name === "AbortError")) {
                message.error(errMsg(e));
            }
        } finally {
            setSubmitting(false);
            if (abortRef.current === ac) abortRef.current = null;
        }
    };

    return (
        <Space direction="vertical" size="large" style={{width: "100%"}}>
            <Title level={4} style={{margin: 0}}>
                RAG 查询
            </Title>
            <Card>
                <Form form={form} layout="vertical" onFinish={onSubmit}>
                    <Form.Item
                        name="knowledgeBaseId"
                        label="知识库"
                        rules={[{required: true, message: "请选择知识库"}]}
                    >
                        <Select
                            loading={loadingKbs}
                            placeholder="选择知识库"
                            options={kbs.map((k) => ({label: k.name, value: k.id}))}
                            showSearch
                            optionFilterProp="label"
                        />
                    </Form.Item>
                    <Form.Item
                        name="query"
                        label="问题"
                        rules={[{required: true, message: "请输入问题"}]}
                    >
                        <Input.TextArea rows={4} placeholder="输入要向知识库提问的内容" />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={submitting}>
                            查询
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
            {(answer || sources.length > 0 || submitting) && (
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
            )}
        </Space>
    );
}
