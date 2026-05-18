import {useState} from "react";
import {Button, Card, Collapse, Form, Input, InputNumber, Space, Tag, Typography, message} from "antd";
import {runMinAgent, type MiniAgentRunResult, type MiniAgentStep} from "@/service/agentApi.ts";
import {RequestError} from "@/service/request.ts";
import MarkdownContent from "@/components/MarkdownContent";

const {Title, Text} = Typography;

function errMsg(e: unknown): string {
    return e instanceof RequestError ? e.message : "请求失败，请稍后重试";
}

function StepPanel({step}: {step: MiniAgentStep}) {
    return (
        <Space direction="vertical" style={{width: "100%"}} size="small">
            {step.assistantText != null && step.assistantText !== "" && (
                <MarkdownContent content={step.assistantText} />
            )}
            {step.tool_calls && step.tool_calls.length > 0 && (
                <pre style={{fontSize: 12, overflow: "auto", maxHeight: 240}}>
                    {JSON.stringify(step.tool_calls, null, 2)}
                </pre>
            )}
            {step.toolResults && step.toolResults.length > 0 && (
                <pre style={{fontSize: 12, overflow: "auto", maxHeight: 240}}>
                    {JSON.stringify(step.toolResults, null, 2)}
                </pre>
            )}
        </Space>
    );
}

export default function AgentPage() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<MiniAgentRunResult | null>(null);
    const [form] = Form.useForm<{message: string; maxSteps?: number}>();

    const onSubmit = async () => {
        try {
            await form.validateFields();
        } catch {
            return;
        }
        const {message: msg, maxSteps} = form.getFieldsValue();
        setLoading(true);
        setResult(null);
        try {
            const res = await runMinAgent(msg, maxSteps);
            setResult(res);
        } catch (e) {
            message.error(errMsg(e));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Space direction="vertical" size="large" style={{width: "100%"}}>
            <Title level={4} style={{margin: 0}}>
                Agent 演示
            </Title>
            <Card>
                <Form form={form} layout="vertical" onFinish={onSubmit} initialValues={{maxSteps: 8}}>
                    <Form.Item name="message" label="消息" rules={[{required: true, message: "请输入消息"}]}>
                        <Input.TextArea rows={5} placeholder="发给 /api/agent/min 的内容" />
                    </Form.Item>
                    <Form.Item name="maxSteps" label="最大步数（可选，1–16）">
                        <InputNumber min={1} max={16} />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading}>
                            运行
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
            {result && (
                <Card
                    title={
                        <Space>
                            <span>回复</span>
                            <Tag>{result.stoppedReason}</Tag>
                            {result.error ? <Tag color="red">error</Tag> : null}
                        </Space>
                    }
                >
                    {result.error ? <Text type="danger">{result.error}</Text> : null}
                    <MarkdownContent content={result.reply} />
                    {result.steps.length > 0 && (
                        <Collapse
                            items={result.steps.map((s) => ({
                                key: String(s.stepIndex),
                                label: `Step ${s.stepIndex}`,
                                children: <StepPanel step={s} />,
                            }))}
                        />
                    )}
                </Card>
            )}
        </Space>
    );
}
