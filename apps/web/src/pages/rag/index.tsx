import {Card, Form, Space, Typography} from "antd";
import RagQueryForm from "@/pages/rag/RagQueryForm.tsx";
import RagResultCard from "@/pages/rag/RagResultCard.tsx";
import {useRagKnowledgeBases, useRagQuery} from "@/pages/rag/useRagQuery.ts";

const {Title} = Typography;

export default function RagPage() {
    const [form] = Form.useForm<{knowledgeBaseId: number; query: string}>();
    const {kbs, loadingKbs} = useRagKnowledgeBases(form);
    const {submitting, answer, sources, streamStatus, submit} = useRagQuery();

    const onSubmit = async () => {
        try {
            await form.validateFields();
        } catch {
            return;
        }
        const {knowledgeBaseId, query} = form.getFieldsValue();
        await submit(knowledgeBaseId, query);
    };

    return (
        <Space direction="vertical" size="large" style={{width: "100%"}}>
            <Title level={4} style={{margin: 0}}>
                RAG 查询
            </Title>
            <Card>
                <RagQueryForm
                    form={form}
                    kbs={kbs}
                    loadingKbs={loadingKbs}
                    submitting={submitting}
                    onSubmit={() => void onSubmit()}
                />
            </Card>
            <RagResultCard
                answer={answer}
                sources={sources}
                submitting={submitting}
                streamStatus={streamStatus}
            />
        </Space>
    );
}
