import {Button, Empty, Popconfirm, Spin} from "antd";
import {DeleteOutlined, PlusOutlined} from "@ant-design/icons";
import type {ChatSession} from "@/service/chatApi.ts";

type ChatSidebarProps = {
    sessions: ChatSession[];
    selectedId: number | null;
    loadingSessions: boolean;
    onSelect: (id: number) => void;
    onCreate: () => void;
    onDelete: (id: number) => void;
};

export default function ChatSidebar({
    sessions,
    selectedId,
    loadingSessions,
    onSelect,
    onCreate,
    onDelete,
}: ChatSidebarProps) {
    return (
        <>
            <div className="chat-sidebar__header">
                <Button type="primary" icon={<PlusOutlined />} block onClick={onCreate}>
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
                                onClick={() => onSelect(item.id)}
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
                                        onConfirm={() => void onDelete(item.id)}
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
        </>
    );
}
