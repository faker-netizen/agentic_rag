import {useCallback, useEffect, useRef, useState} from "react";
import {
    Alert,
    Button,
    Card,
    Col,
    Empty,
    Form,
    Input,
    Modal,
    Popconfirm,
    Row,
    Space,
    Table,
    Tag,
    Typography,
    Upload,
    message,
} from "antd";
import type {ColumnsType} from "antd/es/table";
import {DatabaseOutlined, DeleteOutlined, PlusOutlined, UploadOutlined} from "@ant-design/icons";
import ChunkUploadModal from "@/components/ChunkUploadModal.tsx";
import {
    cancelPendingUpload,
    createKnowledgeBase,
    deleteDocument,
    deleteKnowledgeBase,
    listDocuments,
    listKnowledgeBases,
    resumeChunkedDocumentUpload,
    startChunkedDocumentUpload,
    syncPendingUploadsWithServer,
    UPLOAD_CHUNK_SIZE,
    uploadDocument,
    type KnowledgeBase,
    type KnowledgeBaseDocument,
    type PendingChunkUploadView,
} from "@/service/knowledgeBaseApi.ts";
import {RequestError} from "@/service/request.ts";
import type {ChunkedUploadTask, UploadTaskSnapshot} from "@d2c/utils";

const {Title, Text} = Typography;

function errMsg(e: unknown): string {
    return e instanceof RequestError ? e.message : "操作失败，请稍后重试";
}

export default function KnowledgeBasesPage() {
    const [loadingKb, setLoadingKb] = useState(false);
    const [loadingDocs, setLoadingDocs] = useState(false);
    const [kbs, setKbs] = useState<KnowledgeBase[]>([]);
    const [selectedKb, setSelectedKb] = useState<KnowledgeBase | null>(null);
    const [docs, setDocs] = useState<KnowledgeBaseDocument[]>([]);
    const [createOpen, setCreateOpen] = useState(false);
    const [createSubmitting, setCreateSubmitting] = useState(false);
    const [form] = Form.useForm<{name: string; description?: string}>();
    const [chunkUploadOpen, setChunkUploadOpen] = useState(false);
    const [chunkFileName, setChunkFileName] = useState("");
    const [chunkTask, setChunkTask] = useState<ChunkedUploadTask | null>(null);
    const [chunkSnapshot, setChunkSnapshot] = useState<UploadTaskSnapshot | null>(null);
    const [pendingUploads, setPendingUploads] = useState<PendingChunkUploadView[]>([]);
    const resumeInputRef = useRef<HTMLInputElement>(null);
    const resumePendingRef = useRef<PendingChunkUploadView | null>(null);

    const loadKbs = useCallback(async () => {
        setLoadingKb(true);
        try {
            const list = await listKnowledgeBases();
            setKbs(list);
            setSelectedKb((prev) => {
                if (!prev) return list[0] ?? null;
                const still = list.find((k) => k.id === prev.id);
                return still ?? list[0] ?? null;
            });
        } catch (e) {
            message.error(errMsg(e));
        } finally {
            setLoadingKb(false);
        }
    }, []);

    const loadDocs = useCallback(async (kbId: number) => {
        setLoadingDocs(true);
        try {
            const list = await listDocuments(kbId);
            setDocs(list);
        } catch (e) {
            message.error(errMsg(e));
            setDocs([]);
        } finally {
            setLoadingDocs(false);
        }
    }, []);

    useEffect(() => {
        void loadKbs();
    }, [loadKbs]);

    useEffect(() => {
        if (selectedKb) void loadDocs(selectedKb.id);
        else setDocs([]);
    }, [selectedKb, loadDocs]);

    const refreshPendingUploads = useCallback(async (kbId: number) => {
        try {
            const list = await syncPendingUploadsWithServer(kbId);
            setPendingUploads(list);
        } catch {
            setPendingUploads([]);
        }
    }, []);

    useEffect(() => {
        if (selectedKb) void refreshPendingUploads(selectedKb.id);
        else setPendingUploads([]);
    }, [selectedKb, refreshPendingUploads]);

    const runChunkedUpload = useCallback(
        async (kbId: number, file: File, pending?: PendingChunkUploadView) => {
            const syncProgress = (task: ChunkedUploadTask) => {
                setChunkSnapshot(task.getSnapshot());
            };
            const {task, documentIdPromise} = pending
                ? resumeChunkedDocumentUpload(kbId, file, pending)
                : startChunkedDocumentUpload(kbId, file);
            const prev = {...task.options};
            task.options.onProgress = (snap) => {
                prev.onProgress?.(snap);
                syncProgress(task);
            };
            task.options.onStatusChange = (st, snap) => {
                prev.onStatusChange?.(st, snap);
                syncProgress(task);
            };
            task.options.onSuccess = (r, snap) => {
                prev.onSuccess?.(r, snap);
                syncProgress(task);
            };
            task.options.onError = (err, snap) => {
                prev.onError?.(err, snap);
                syncProgress(task);
            };
            setChunkFileName(file.name);
            setChunkTask(task);
            setChunkSnapshot(task.getSnapshot());
            setChunkUploadOpen(true);
            await documentIdPromise;
            message.success("上传成功");
            setChunkUploadOpen(false);
            setChunkTask(null);
            await loadDocs(kbId);
            await refreshPendingUploads(kbId);
        },
        [loadDocs, refreshPendingUploads]
    );

    const handleCreateSubmit = async () => {
        try {
            await form.validateFields();
        } catch {
            return Promise.reject();
        }
        setCreateSubmitting(true);
        try {
            const v = form.getFieldsValue();
            await createKnowledgeBase(v.name, v.description);
            message.success("知识库已创建");
            setCreateOpen(false);
            form.resetFields();
            await loadKbs();
        } catch (e) {
            message.error(errMsg(e));
            return Promise.reject();
        } finally {
            setCreateSubmitting(false);
        }
    };

    const onDeleteKb = async (kb: KnowledgeBase) => {
        try {
            await deleteKnowledgeBase(kb.id);
            message.success("已删除知识库");
            if (selectedKb?.id === kb.id) setSelectedKb(null);
            await loadKbs();
        } catch (e) {
            message.error(errMsg(e));
        }
    };

    const onDeleteDoc = async (doc: KnowledgeBaseDocument) => {
        if (!selectedKb) return;
        try {
            await deleteDocument(selectedKb.id, doc.id);
            message.success("已删除文档");
            await loadDocs(selectedKb.id);
        } catch (e) {
            message.error(errMsg(e));
        }
    };

    const kbColumns: ColumnsType<KnowledgeBase> = [
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
                <Popconfirm title="删除该知识库及其全部文档？" onConfirm={() => onDeleteKb(row)}>
                    <Button type="link" danger size="small" icon={<DeleteOutlined />}>
                        删除
                    </Button>
                </Popconfirm>
            ),
        },
    ];

    const docColumns: ColumnsType<KnowledgeBaseDocument> = [
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
                <Popconfirm title="删除该文档？" onConfirm={() => onDeleteDoc(row)}>
                    <Button type="link" danger size="small">
                        删除
                    </Button>
                </Popconfirm>
            ),
        },
    ];

    return (
        <div>
            <Title level={4} style={{marginTop: 0}}>
                知识库管理
            </Title>
            <Text type="secondary">维护知识库列表；选中后在右侧管理该库下的文档并上传文件。</Text>

            <Row gutter={16} style={{marginTop: 16}}>
                <Col xs={24} lg={8}>
                    <Card
                        title="知识库"
                        extra={
                            <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
                                新建
                            </Button>
                        }
                    >
                        <Table<KnowledgeBase>
                            size="small"
                            rowKey="id"
                            loading={loadingKb}
                            columns={kbColumns}
                            dataSource={kbs}
                            pagination={false}
                            locale={{emptyText: <Empty description="暂无知识库，请先新建" />}}
                            onRow={(row) => ({
                                onClick: () => setSelectedKb(row),
                                style: {
                                    cursor: "pointer",
                                    background: selectedKb?.id === row.id ? "rgba(22, 119, 255, 0.08)" : undefined,
                                },
                            })}
                        />
                    </Card>
                </Col>
                <Col xs={24} lg={16}>
                    <Card
                        title={selectedKb ? `文档 — ${selectedKb.name}` : "文档"}
                        extra={
                            selectedKb ? (
                                <Upload
                                    showUploadList={false}
                                    accept=".pdf,.doc,.docx,.txt,.md"
                                    beforeUpload={async (file) => {
                                        try {
                                            if (file.size <= UPLOAD_CHUNK_SIZE) {
                                                await uploadDocument(selectedKb.id, file);
                                                message.success("上传成功");
                                                await loadDocs(selectedKb.id);
                                            } else {
                                                await runChunkedUpload(selectedKb.id, file);
                                            }
                                        } catch (e) {
                                            message.error(
                                                axiosLikeMsg(e) || (e instanceof Error ? e.message : "上传失败")
                                            );
                                            if (selectedKb) void refreshPendingUploads(selectedKb.id);
                                        }
                                        return false;
                                    }}
                                >
                                    <Button type="primary" icon={<UploadOutlined />} disabled={!selectedKb}>
                                        上传文件
                                    </Button>
                                </Upload>
                            ) : null
                        }
                    >
                        {!selectedKb ? (
                            <Empty description="请先在左侧选择一个知识库" />
                        ) : (
                            <>
                                {pendingUploads.length > 0 ? (
                                    <Space direction="vertical" style={{width: "100%", marginBottom: 16}}>
                                        {pendingUploads.map((p) => (
                                            <Alert
                                                key={p.fileId}
                                                type="warning"
                                                showIcon
                                                message={`未完成上传：${p.fileName}`}
                                                description={`服务端已保存 ${p.uploadedChunks}/${p.totalChunks} 个分片，请选择同一文件继续上传`}
                                                action={
                                                    <Space>
                                                        <Button
                                                            size="small"
                                                            type="primary"
                                                            onClick={() => {
                                                                resumePendingRef.current = p;
                                                                resumeInputRef.current?.click();
                                                            }}
                                                        >
                                                            继续上传
                                                        </Button>
                                                        <Button
                                                            size="small"
                                                            danger
                                                            onClick={() => {
                                                                void (async () => {
                                                                    try {
                                                                        await cancelPendingUpload(
                                                                            selectedKb.id,
                                                                            p.fileId
                                                                        );
                                                                        message.success("已取消未完成上传");
                                                                        await refreshPendingUploads(selectedKb.id);
                                                                    } catch (e) {
                                                                        message.error(errMsg(e));
                                                                    }
                                                                })();
                                                            }}
                                                        >
                                                            放弃
                                                        </Button>
                                                    </Space>
                                                }
                                            />
                                        ))}
                                    </Space>
                                ) : null}
                                <input
                                    ref={resumeInputRef}
                                    type="file"
                                    accept=".pdf,.doc,.docx,.txt,.md"
                                    style={{display: "none"}}
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        const pending = resumePendingRef.current;
                                        e.target.value = "";
                                        resumePendingRef.current = null;
                                        if (!file || !pending || !selectedKb) return;
                                        void runChunkedUpload(selectedKb.id, file, pending).catch((err) => {
                                            message.error(
                                                axiosLikeMsg(err) ||
                                                    (err instanceof Error ? err.message : "续传失败")
                                            );
                                            void refreshPendingUploads(selectedKb.id);
                                        });
                                    }}
                                />
                                <Table<KnowledgeBaseDocument>
                                size="small"
                                rowKey="id"
                                loading={loadingDocs}
                                columns={docColumns}
                                dataSource={docs}
                                pagination={{pageSize: 10, showSizeChanger: true}}
                                locale={{emptyText: <Empty description="该知识库暂无文档" />}}
                            />
                            </>
                        )}
                    </Card>
                </Col>
            </Row>

            <ChunkUploadModal
                open={chunkUploadOpen}
                fileName={chunkFileName}
                snapshot={chunkSnapshot}
                task={chunkTask}
                onClose={() => {
                    setChunkUploadOpen(false);
                    setChunkTask(null);
                    setChunkSnapshot(null);
                }}
            />

            <Modal
                title="新建知识库"
                open={createOpen}
                onCancel={() => {
                    setCreateOpen(false);
                    form.resetFields();
                }}
                onOk={handleCreateSubmit}
                confirmLoading={createSubmitting}
                destroyOnClose
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
        </div>
    );
}

function axiosLikeMsg(e: unknown): string | null {
    if (e && typeof e === "object" && "response" in e) {
        const data = (e as {response?: {data?: {error?: string}}}).response?.data;
        if (data?.error) return data.error;
    }
    return null;
}
