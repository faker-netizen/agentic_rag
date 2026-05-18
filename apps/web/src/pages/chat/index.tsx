import {memo, useCallback, useEffect, useRef, useState, type RefObject} from "react";
import {
    Button,
    Empty,
    Flex,
    Form,
    Input,
    Layout,
    List,
    Modal,
    Popconfirm,
    Select,
    Spin,
    Tag,
    Typography,
    theme,
    message,
} from "antd";
import {
    DeleteOutlined,
    PlusOutlined,
    RobotOutlined,
    SendOutlined,
    StopOutlined,
    UserOutlined,
} from "@ant-design/icons";
import {
    createChatSession,
    deleteChatSession,
    listChatMessages,
    listChatSessions,
    streamChatMessage,
    type ChatMessage,
    type ChatSession,
    type ChatSource,
} from "@/service/chatApi.ts";
import {listKnowledgeBases, type KnowledgeBase} from "@/service/knowledgeBaseApi.ts";
import {RequestError} from "@/service/request.ts";
import MarkdownContent from "@/components/MarkdownContent";
import {
    StreamingPlainContent,
    type StreamingPlainHandle,
} from "@/components/MarkdownContent/StreamingPlainContent.tsx";

const {Text, Title} = Typography;
const {Sider, Content} = Layout;

function errText(e: unknown): string {
    return e instanceof RequestError ? e.message : "操作失败，请稍后重试";
}

function isAbortError(e: unknown): boolean {
    if (e instanceof DOMException && e.name === "AbortError") return true;
    if (e instanceof Error && e.name === "AbortError") return true;
    return false;
}

function parseSources(raw: unknown): ChatSource[] {
    if (raw == null) return [];
    if (Array.isArray(raw)) return raw as ChatSource[];
    if (typeof raw === "string") {
        try {
            const v = JSON.parse(raw) as unknown;
            return Array.isArray(v) ? (v as ChatSource[]) : [];
        } catch {
            return [];
        }
    }
    return [];
}

export default function ChatPage() {
    const {token} = theme.useToken();
    const bottomRef = useRef<HTMLDivElement>(null);
    const streamAbortRef = useRef<AbortController | null>(null);
    const streamBodyRef = useRef<StreamingPlainHandle | null>(null);
    const scrollRafRef = useRef<number | null>(null);

    const scheduleScrollToBottom = useCallback(() => {
        if (scrollRafRef.current != null) return;
        scrollRafRef.current = requestAnimationFrame(() => {
            scrollRafRef.current = null;
            bottomRef.current?.scrollIntoView({behavior: "smooth"});
        });
    }, []);

    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [loadingSessions, setLoadingSessions] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [sending, setSending] = useState(false);
    /** 正在流式输出的助手消息 id（临时负数 id 或落库后的 id） */
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

    useEffect(() => {
        bottomRef.current?.scrollIntoView({behavior: "smooth"});
    }, [messages, sending]);

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
                        streamBodyRef.current?.append(delta);
                    },
                    onError: ({message: errMsg}) => {
                        message.warning(errMsg);
                    },
                    onDone: (r) => {
                        setStreamingAssistantId(null);
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
        } finally {
            streamAbortRef.current = null;
            setSending(false);
            setStreamingAssistantId(null);
        }
    };

    const onStopStream = () => {
        streamAbortRef.current?.abort();
    };

    const selectedSession = sessions.find((s) => s.id === selectedId) ?? null;

    return (
        <div style={{height: "calc(100vh - 64px - 48px)", minHeight: 420, display: "flex", flexDirection: "column"}}>
            <Title level={4} style={{marginTop: 0, flexShrink: 0}}>
                会话
            </Title>
            <Layout style={{flex: 1, minHeight: 0, background: token.colorBgContainer, borderRadius: token.borderRadiusLG}}>
                <Sider
                    width={280}
                    style={{
                        background: token.colorFillAlter,
                        borderRight: `1px solid ${token.colorBorderSecondary}`,
                        overflow: "auto",
                    }}
                >
                    <div style={{padding: 12, borderBottom: `1px solid ${token.colorBorderSecondary}`}}>
                        <Button type="primary" icon={<PlusOutlined />} block onClick={openCreate}>
                            新建会话
                        </Button>
                    </div>
                    <Spin spinning={loadingSessions}>
                        <List
                            size="small"
                            dataSource={sessions}
                            locale={{emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无会话" />}}
                            renderItem={(item) => (
                                <List.Item
                                    style={{
                                        cursor: "pointer",
                                        paddingInline: 12,
                                        background: selectedId === item.id ? "rgba(22, 119, 255, 0.12)" : undefined,
                                    }}
                                    onClick={() => setSelectedId(item.id)}
                                    actions={[
                                        <Popconfirm
                                            key="del"
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
                                        </Popconfirm>,
                                    ]}
                                >
                                    <List.Item.Meta
                                        title={
                                            <Text ellipsis style={{maxWidth: 200}}>
                                                {item.title}
                                            </Text>
                                        }
                                        description={
                                            item.knowledge_base_id != null ? (
                                                <Text type="secondary" style={{fontSize: 12}}>
                                                    知识库 #{item.knowledge_base_id}
                                                </Text>
                                            ) : (
                                                <Text type="secondary" style={{fontSize: 12}}>
                                                    纯对话
                                                </Text>
                                            )
                                        }
                                    />
                                </List.Item>
                            )}
                        />
                    </Spin>
                </Sider>
                <Content style={{display: "flex", flexDirection: "column", minWidth: 0}}>
                    {!selectedId ? (
                        <Flex align="center" justify="center" style={{flex: 1}}>
                            <Empty description="请选择左侧会话或新建会话" />
                        </Flex>
                    ) : (
                        <>
                            <div
                                style={{
                                    padding: "10px 16px",
                                    borderBottom: `1px solid ${token.colorBorderSecondary}`,
                                    flexShrink: 0,
                                }}
                            >
                                <Text strong>{selectedSession?.title ?? "会话"}</Text>
                                {selectedSession?.knowledge_base_id != null && (
                                    <Tag style={{marginLeft: 8}}>RAG 知识库</Tag>
                                )}
                            </div>
                            <div style={{flex: 1, overflow: "auto", padding: 16}}>
                                <Spin spinning={loadingMessages}>
                                    {messages.length === 0 && !loadingMessages ? (
                                        <Empty description="发送第一条消息开始聊天" />
                                    ) : (
                                        <Flex vertical gap={16}>
                                            {messages.map((m) => (
                                                <MessageBubble
                                                    key={m.id}
                                                    message={m}
                                                    isStreaming={
                                                        m.role === "assistant" &&
                                                        streamingAssistantId != null &&
                                                        m.id === streamingAssistantId
                                                    }
                                                    streamBodyRef={
                                                        m.role === "assistant" &&
                                                        streamingAssistantId != null &&
                                                        m.id === streamingAssistantId
                                                            ? streamBodyRef
                                                            : undefined
                                                    }
                                                    onStreamAppend={scheduleScrollToBottom}
                                                />
                                            ))}
                                            <div ref={bottomRef} />
                                        </Flex>
                                    )}
                                </Spin>
                            </div>
                            <div
                                style={{
                                    padding: 12,
                                    borderTop: `1px solid ${token.colorBorderSecondary}`,
                                    flexShrink: 0,
                                }}
                            >
                                <Flex gap={8}>
                                    <Input.TextArea
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder="输入消息，Enter 发送（Shift+Enter 换行）"
                                        autoSize={{minRows: 1, maxRows: 6}}
                                        onPressEnter={(e) => {
                                            if (!e.shiftKey) {
                                                e.preventDefault();
                                                void onSend();
                                            }
                                        }}
                                        disabled={sending}
                                    />
                                    <Button
                                        danger
                                        icon={<StopOutlined />}
                                        disabled={!sending}
                                        onClick={() => onStopStream()}
                                    >
                                        停止
                                    </Button>
                                    <Button
                                        type="primary"
                                        icon={<SendOutlined />}
                                        loading={sending}
                                        onClick={() => void onSend()}
                                    >
                                        发送
                                    </Button>
                                </Flex>
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

const MessageBubble = memo(function MessageBubble({
    message,
    isStreaming = false,
    streamBodyRef,
    onStreamAppend,
}: {
    message: ChatMessage;
    isStreaming?: boolean;
    streamBodyRef?: RefObject<StreamingPlainHandle | null>;
    onStreamAppend?: () => void;
}) {
    const {token} = theme.useToken();
    const isUser = message.role === "user";
    const sources = message.role === "assistant" ? parseSources(message.sources_json) : [];

    return (
        <Flex justify={isUser ? "flex-end" : "flex-start"}>
            <Flex gap={8} style={{maxWidth: "min(720px, 85%)"}} align="flex-start">
                {!isUser && (
                    <RobotOutlined
                        style={{
                            fontSize: 18,
                            marginTop: 4,
                            color: token.colorPrimary,
                        }}
                    />
                )}
                <div
                    style={{
                        background: isUser ? token.colorPrimaryBg : token.colorFillSecondary,
                        border: `1px solid ${token.colorBorderSecondary}`,
                        borderRadius: token.borderRadiusLG,
                        padding: "10px 14px",
                    }}
                >
                    {isUser ? (
                        <Text style={{whiteSpace: "pre-wrap", wordBreak: "break-word"}}>{message.content}</Text>
                    ) : isStreaming && streamBodyRef ? (
                        <StreamingPlainContent ref={streamBodyRef} onAppend={onStreamAppend} />
                    ) : (
                        <MarkdownContent content={message.content} />
                    )}
                    {sources.length > 0 && (
                        <div style={{marginTop: 8}}>
                            <Text type="secondary" style={{fontSize: 12}}>
                                引用：
                            </Text>{" "}
                            {sources.map((s) => (
                                <Tag key={s.id} style={{marginTop: 4}}>
                                    {s.title}
                                </Tag>
                            ))}
                        </div>
                    )}
                </div>
                {isUser && <UserOutlined style={{fontSize: 18, marginTop: 4, color: token.colorTextSecondary}} />}
            </Flex>
        </Flex>
    );
});
