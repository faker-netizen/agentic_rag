import {useCallback, useEffect, useRef, useState} from "react";
import {
    Button,
    Empty,
    Form,
    Input,
    Layout,
    Modal,
    Popconfirm,
    Select,
    Spin,
    Tag,
    message,
} from "antd";
import {
    DeleteOutlined,
    PlusOutlined,
    SendOutlined,
    StopOutlined,
} from "@ant-design/icons";
import {
    createChatSession,
    deleteChatSession,
    listChatMessages,
    listChatSessions,
    streamChatMessage,
    type ChatMessage,
    type ChatSession,
} from "@/service/chatApi.ts";
import {listKnowledgeBases, type KnowledgeBase} from "@/service/knowledgeBaseApi.ts";
import {RequestError} from "@/service/request.ts";
import ChatMessageVirtualList, {
    type ChatMessageVirtualListHandle,
} from "@/components/ChatMessageVirtualList.tsx";
import {useRafStreamBuffer} from "@/hooks/useRafStreamBuffer.ts";
import "./chat.css";

const {Content, Sider} = Layout;

function errText(e: unknown): string {
    return e instanceof RequestError ? e.message : "操作失败，请稍后重试";
}

function isAbortError(e: unknown): boolean {
    if (e instanceof DOMException && e.name === "AbortError") return true;
    if (e instanceof Error && e.name === "AbortError") return true;
    return false;
}

export default function ChatPage() {
    const messageListRef = useRef<ChatMessageVirtualListHandle>(null);
    const streamAbortRef = useRef<AbortController | null>(null);
    const scrollRafRef = useRef<number | null>(null);

    const scheduleScrollToBottom = useCallback(() => {
        if (scrollRafRef.current != null) return;
        scrollRafRef.current = requestAnimationFrame(() => {
            scrollRafRef.current = null;
            messageListRef.current?.scrollToBottom("auto");
        });
    }, []);

    const streamBuffer = useRafStreamBuffer(scheduleScrollToBottom);

    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [loadingSessions, setLoadingSessions] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [sending, setSending] = useState(false);
    const [streamingAssistantId, setStreamingAssistantId] = useState<number | null>(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);
    const [kbs, setKbs] = useState<KnowledgeBase[]>([]);
    const [form] = Form.useForm<{knowledgeBaseId?: number; title?: string}>();

    const loadSessions = useCallback(async () => {
        setLoadingSessions(true);
        try {
            const list = await listChatSessions();
            setSessions(list);
            setSelectedId((prev) => {
                if (prev != null && list.some((s) => s.id === prev)) return prev;
                return list[0]?.id ?? null;
            });
        } catch (e) {
            message.error(errText(e));
        } finally {
            setLoadingSessions(false);
        }
    }, []);

    const loadMessages = useCallback(async (sessionId: number) => {
        setLoadingMessages(true);
        try {
            const list = await listChatMessages(sessionId);
            setMessages(list);
        } catch (e) {
            message.error(errText(e));
            setMessages([]);
        } finally {
            setLoadingMessages(false);
        }
    }, []);

    useEffect(() => {
        void loadSessions();
    }, [loadSessions]);

    useEffect(() => {
        if (selectedId != null) void loadMessages(selectedId);
        else setMessages([]);
    }, [selectedId, loadMessages]);

    const openCreate = async () => {
        setCreateOpen(true);
        try {
            setKbs(await listKnowledgeBases());
        } catch {
            setKbs([]);
        }
        form.resetFields();
    };

    const onCreate = async () => {
        const v = await form.validateFields().catch(() => null);
        if (!v) return;
        setCreateLoading(true);
        try {
            const id = await createChatSession({
                knowledgeBaseId: v.knowledgeBaseId,
                title: v.title,
            });
            message.success("已创建会话");
            setCreateOpen(false);
            await loadSessions();
            setSelectedId(id);
        } catch (e) {
            message.error(errText(e));
        } finally {
            setCreateLoading(false);
        }
    };

    const onDeleteSession = async (id: number) => {
        try {
            await deleteChatSession(id);
            message.success("已删除");
            if (selectedId === id) setSelectedId(null);
            await loadSessions();
        } catch (e) {
            message.error(errText(e));
        }
    };

    const onSend = async () => {
        const text = input.trim();
        if (!selectedId || !text) return;
        setSending(true);
        const tempUser = -Date.now();
        const tempAsst = tempUser - 1;
        setStreamingAssistantId(tempAsst);
        streamBuffer.reset();
        const nowIso = new Date().toISOString();
        setMessages((prev) => [
            ...prev,
            {
                id: tempUser,
                session_id: selectedId,
                role: "user",
                content: text,
                sources_json: null,
                created_at: nowIso,
            },
            {
                id: tempAsst,
                session_id: selectedId,
                role: "assistant",
                content: "",
                sources_json: null,
                created_at: nowIso,
            },
        ]);
        setInput("");
        const ac = new AbortController();
        streamAbortRef.current = ac;
        try {
            await streamChatMessage(
                selectedId,
                text,
                {
                    onMeta: ({userMessageId}) => {
                        setMessages((prev) =>
                            prev.map((m) => (m.id === tempUser ? {...m, id: userMessageId} : m))
                        );
                    },
                    onSources: ({sources}) => {
                        setMessages((prev) =>
                            prev.map((m) =>
                                m.id === tempAsst
                                    ? {
                                          ...m,
                                          sources_json: sources?.length ? JSON.stringify(sources) : null,
                                      }
                                    : m
                            )
                        );
                    },
                    onToken: ({text: delta}) => {
                        streamBuffer.append(delta);
                    },
                    onError: ({message: errMsg}) => {
                        message.warning(errMsg);
                    },
                    onDone: (r) => {
                        streamBuffer.flush(r.answer);
                        setMessages((prev) =>
                            prev.map((m) =>
                                m.id === tempAsst
                                    ? {
                                          ...m,
                                          id: r.assistantMessageId,
                                          content: r.answer,
                                          sources_json: r.sources?.length
                                              ? JSON.stringify(r.sources)
                                              : null,
                                      }
                                    : m
                            )
                        );
                        requestAnimationFrame(() => {
                            setStreamingAssistantId(null);
                            streamBuffer.reset();
                        });
                    },
                },
                {signal: ac.signal}
            );
            await loadSessions();
        } catch (e) {
            if (isAbortError(e)) {
                message.info("已停止生成");
                await loadMessages(selectedId);
                await loadSessions();
            } else {
                message.error(errText(e));
                await loadMessages(selectedId);
            }
            setStreamingAssistantId(null);
            streamBuffer.reset();
        } finally {
            streamAbortRef.current = null;
            setSending(false);
        }
    };

    const onStopStream = () => {
        streamAbortRef.current?.abort();
    };

    const selectedSession = sessions.find((s) => s.id === selectedId) ?? null;

    return (
        <div className="chat-page">
            <Layout className="chat-page-layout" style={{height: "100%"}}>
                <Sider width={280} theme="light" className="chat-sidebar" style={{height: "100%"}}>
                    <div className="chat-sidebar__header">
                        <Button type="primary" icon={<PlusOutlined />} block onClick={openCreate}>
                            新建会话
                        </Button>
                    </div>
                    <Spin spinning={loadingSessions} wrapperClassName="chat-sidebar__spin">
                        <div className="chat-session-list">
                            {sessions.length === 0 && !loadingSessions ? (
                                <Empty
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    description="暂无会话"
                                    style={{marginTop: 24}}
                                />
                            ) : (
                                sessions.map((item) => (
                                    <div
                                        key={item.id}
                                        className={[
                                            "chat-session-item",
                                            selectedId === item.id && "chat-session-item--selected",
                                        ]
                                            .filter(Boolean)
                                            .join(" ")}
                                        onClick={() => setSelectedId(item.id)}
                                    >
                                        <div className="chat-session-item__body">
                                            <div className="chat-session-item__title">{item.title}</div>
                                            <div className="chat-session-item__desc">
                                                {item.knowledge_base_id != null
                                                    ? `知识库 #${item.knowledge_base_id}`
                                                    : "纯对话"}
                                            </div>
                                        </div>
                                        <div className="chat-session-item__actions">
                                            <Popconfirm
                                                title="删除该会话及全部消息？"
                                                onConfirm={() => void onDeleteSession(item.id)}
                                            >
                                                <Button
                                                    type="text"
                                                    size="small"
                                                    danger
                                                    icon={<DeleteOutlined />}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </Popconfirm>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </Spin>
                </Sider>

                <Content className="chat-main">
                    {!selectedId ? (
                        <div className="chat-main__empty">
                            <h2 className="chat-main__empty-title">开始对话</h2>
                            <p className="chat-main__empty-desc">选择左侧会话，或新建一个开始聊天</p>
                        </div>
                    ) : (
                        <>
                            <div className="chat-main__header">
                                <span className="chat-main__title">{selectedSession?.title ?? "会话"}</span>
                                {selectedSession?.knowledge_base_id != null && (
                                    <Tag style={{marginLeft: 8}} color="blue">
                                        RAG 知识库
                                    </Tag>
                                )}
                            </div>

                            <div className="chat-messages-panel">
                                {loadingMessages && (
                                    <div className="chat-messages-panel__loading">
                                        <Spin />
                                    </div>
                                )}
                                <ChatMessageVirtualList
                                    ref={messageListRef}
                                    messages={messages}
                                    loading={loadingMessages}
                                    streamingAssistantId={streamingAssistantId}
                                    streamDisplay={streamBuffer.display}
                                />
                            </div>

                            <div className="chat-composer-wrap">
                                <div className="chat-composer">
                                    <Input.TextArea
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder="输入消息，Enter 发送（Shift+Enter 换行）"
                                        autoSize={{minRows: 1, maxRows: 6}}
                                        variant="borderless"
                                        onPressEnter={(e) => {
                                            if (!e.shiftKey) {
                                                e.preventDefault();
                                                void onSend();
                                            }
                                        }}
                                        disabled={sending}
                                    />
                                    <div className="chat-composer__actions">
                                        <Button
                                            danger
                                            size="small"
                                            icon={<StopOutlined />}
                                            disabled={!sending}
                                            onClick={() => onStopStream()}
                                        >
                                            停止
                                        </Button>
                                        <Button
                                            type="primary"
                                            size="small"
                                            icon={<SendOutlined />}
                                            loading={sending}
                                            onClick={() => void onSend()}
                                        >
                                            发送
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </Content>
            </Layout>

            <Modal
                title="新建会话"
                open={createOpen}
                onCancel={() => setCreateOpen(false)}
                onOk={() => void onCreate()}
                confirmLoading={createLoading}
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
        </div>
    );
}
