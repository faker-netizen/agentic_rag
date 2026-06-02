import {Button, Form, Input, Select} from "antd";
import type {KnowledgeBase} from "@/service/knowledgeBaseApi.ts";

type RagQueryFormProps = {
    form: ReturnType<typeof Form.useForm<{knowledgeBaseId: number; query: string}>>[0];
    kbs: KnowledgeBase[];
    loadingKbs: boolean;
    submitting: boolean;
    onSubmit: () => void;
};

export default function RagQueryForm({form, kbs, loadingKbs, submitting, onSubmit}: RagQueryFormProps) {
    return (
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
            <Form.Item name="query" label="问题" rules={[{required: true, message: "请输入问题"}]}>
                <Input.TextArea rows={4} placeholder="输入要向知识库提问的内容" />
            </Form.Item>
            <Form.Item>
                <Button type="primary" htmlType="submit" loading={submitting}>
                    查询
                </Button>
            </Form.Item>
        </Form>
    );
}
