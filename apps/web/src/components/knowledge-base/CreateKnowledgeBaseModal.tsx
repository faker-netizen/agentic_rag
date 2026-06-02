import {Form, Input, Modal} from "antd";

type CreateKnowledgeBaseModalProps = {
    open: boolean;
    submitting: boolean;
    onCancel: () => void;
    onSubmit: (name: string, description?: string) => Promise<void>;
};

export default function CreateKnowledgeBaseModal({
    open,
    submitting,
    onCancel,
    onSubmit,
}: CreateKnowledgeBaseModalProps) {
    const [form] = Form.useForm<{name: string; description?: string}>();

    const handleOk = async () => {
        try {
            await form.validateFields();
        } catch {
            return;
        }
        const values = form.getFieldsValue();
        await onSubmit(values.name, values.description);
        form.resetFields();
    };

    return (
        <Modal
            title="新建知识库"
            open={open}
            onCancel={() => {
                form.resetFields();
                onCancel();
            }}
            onOk={handleOk}
            confirmLoading={submitting}
            destroyOnClose
            okText="创建"
        >
            <Form form={form} layout="vertical" style={{marginTop: 8}}>
                <Form.Item name="name" label="名称" rules={[{required: true, message: "请输入名称"}]}>
                    <Input placeholder="例如：产品手册" maxLength={255} />
                </Form.Item>
                <Form.Item name="description" label="描述（可选）">
                    <Input.TextArea placeholder="简要说明用途" rows={3} maxLength={2000} />
                </Form.Item>
            </Form>
        </Modal>
    );
}
