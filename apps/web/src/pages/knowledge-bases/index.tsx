import {useState} from "react";
import {Card, Col, Row, Typography, message} from "antd";
import CreateKnowledgeBaseModal from "@/components/knowledge-base/CreateKnowledgeBaseModal.tsx";
import {useCreateKnowledgeBase, useKnowledgeBaseList} from "@/hooks/useKnowledgeBaseList.ts";
import KnowledgeBaseListCard from "@/pages/knowledge-bases/KnowledgeBaseListCard.tsx";
import KnowledgeBaseDocumentsPanel from "@/pages/knowledge-bases/KnowledgeBaseDocumentsPanel.tsx";
import {useSelectedKnowledgeBase} from "@/pages/knowledge-bases/useSelectedKnowledgeBase.ts";

const {Title, Text} = Typography;

export default function KnowledgeBasesPage() {
    const [createOpen, setCreateOpen] = useState(false);
    const {kbs, loading, refresh} = useKnowledgeBaseList();
    const {selectedKb, setSelectedKb, deleteKb} = useSelectedKnowledgeBase(kbs);
    const {create, submitting} = useCreateKnowledgeBase(async () => {
        await refresh();
    });

    const handleCreate = async (name: string, description?: string) => {
        try {
            await create(name, description);
            message.success("知识库已创建");
            setCreateOpen(false);
        } catch (e) {
            message.error(e instanceof Error ? e.message : "创建失败");
        }
    };

    return (
        <div>
            <Title level={4} style={{marginTop: 0}}>
                知识库管理
            </Title>
            <Text type="secondary">维护知识库列表；选中后在右侧管理该库下的文档并上传文件。</Text>

            <Row gutter={16} style={{marginTop: 16}}>
                <Col xs={24} lg={8}>
                    <Card bodyStyle={{padding: 0}}>
                        <KnowledgeBaseListCard
                            kbs={kbs}
                            loading={loading}
                            selectedKb={selectedKb}
                            onSelect={setSelectedKb}
                            onDelete={(kb) => void deleteKb(kb, refresh)}
                            onCreate={() => setCreateOpen(true)}
                        />
                    </Card>
                </Col>
                <Col xs={24} lg={16}>
                    <Card title={selectedKb ? `文档 — ${selectedKb.name}` : "文档"}>
                        <KnowledgeBaseDocumentsPanel selectedKb={selectedKb} />
                    </Card>
                </Col>
            </Row>

            <CreateKnowledgeBaseModal
                open={createOpen}
                submitting={submitting}
                onCancel={() => setCreateOpen(false)}
                onSubmit={handleCreate}
            />
        </div>
    );
}
