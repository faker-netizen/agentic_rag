import {Form, Input, Modal, Select} from "antd";
import type {KnowledgeBase} from "@/service/knowledgeBaseApi.ts";

type CreateSessionModalProps = {
    open: boolean;
    loading: boolean;
    kbs: KnowledgeBase[];
    onCancel: () => void;
    onSubmit: (values: {knowledgeBaseId?: number; title?: string}) => void;
};

export default function CreateSessionModal({
    open,
    loading,
    kbs,
    onCancel,
    onSubmit,
}: CreateSessionModalProps) {
    const [form] = Form.useForm<{knowledgeBaseId?: number; title?: string}>();

    const handleOk = async () => {
        const v = await form.validateFields().catch(() => null);
        if (!v) return;
        onSubmit(v);
        form.resetFields();
    };

    return (
        <Modal
            title="新建会话"
            open={open}
            onCancel={() => {
                form.resetFields();
                onCancel();
            }}
            onOk={() => void handleOk()}
            confirmLoading={loading}
            destroyOnClose
        >
            <Form form={form} layout="vertical" style={{marginTop: 8}}>
                <Form.Item name="knowledgeBaseId" label="关联知识库（可选）">
                    <Select
                        allowClear
                        placeholder="不选则为纯对话（无 RAG）"
                        options={kbs.map((k) => ({label: k.name, value: k.id}))}
                    />
                </Form.Item>
                <Form.Item name="title" label="标题（可选）">
                    <Input placeholder="默认：新会话，首条消息后会自动摘要" maxLength={255} />
                </Form.Item>
            </Form>
        </Modal>
    );
}
