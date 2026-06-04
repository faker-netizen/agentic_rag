import {useEffect, useRef} from "react";
import {Layout} from "antd";
import type {ChatMessageVirtualListHandle} from "@/components/ChatMessageVirtualList.tsx";
import {useRafStreamBuffer} from "@/hooks/useRafStreamBuffer.ts";
import {useScrollToBottomRaf} from "@/components/chatMessageVirtualListUtils.ts";
import ChatSidebar from "@/pages/chat/ChatSidebar.tsx";
import ChatConversation from "@/pages/chat/ChatConversation.tsx";
import CreateSessionModal from "@/pages/chat/CreateSessionModal.tsx";
import {useChatSessions} from "@/pages/chat/useChatSessions.ts";
import {useChatMessages} from "@/pages/chat/useChatMessages.ts";
import {useChatSend} from "@/pages/chat/useChatSend.ts";
import {useChatSkills} from "@/pages/chat/useChatSkills.ts";
import "./chat.css";

const {Content, Sider} = Layout;

export default function ChatPage() {
    const messageListRef = useRef<ChatMessageVirtualListHandle>(null);
    const scheduleScrollToBottom = useScrollToBottomRaf();
    const streamBuffer = useRafStreamBuffer(() => {
        scheduleScrollToBottom(() => messageListRef.current?.scrollToBottom("auto"));
    });

    const sessions = useChatSessions();
    const chatSkills = useChatSkills();
    useEffect(() => {
        void chatSkills.loadSkills();
    }, [chatSkills]);
    const {messages, setMessages, loadingMessages, loadMessages} = useChatMessages(sessions.selectedId);
    const send = useChatSend({
        selectedId: sessions.selectedId,
        selectedSkillId: chatSkills.selectedSkillId,
        streamBuffer,
        setMessages,
        loadMessages,
        loadSessions: sessions.loadSessions,
    });

    return (
        <div className="chat-page">
            <Layout className="chat-page-layout" style={{height: "100%"}}>
                <Sider width={280} theme="light" className="chat-sidebar" style={{height: "100%"}}>
                    <ChatSidebar
                        sessions={sessions.sessions}
                        selectedId={sessions.selectedId}
                        loadingSessions={sessions.loadingSessions}
                        onSelect={sessions.setSelectedId}
                        onCreate={() => void sessions.openCreate()}
                        onDelete={sessions.onDeleteSession}
                    />
                </Sider>

                <Content className="chat-main">
                    {!sessions.selectedId ? (
                        <div className="chat-main__empty">
                            <h2 className="chat-main__empty-title">开始对话</h2>
                            <p className="chat-main__empty-desc">选择左侧会话，或新建一个开始聊天</p>
                        </div>
                    ) : (
                        <ChatConversation
                            session={sessions.selectedSession}
                            messages={messages}
                            loadingMessages={loadingMessages}
                            streamingAssistantId={send.streamingAssistantId}
                            streamDisplay={streamBuffer.display}
                            streamStatus={send.streamStatus}
                            activeSkillName={send.activeSkillName}
                            skills={chatSkills.skills}
                            selectedSkillId={chatSkills.selectedSkillId}
                            onSkillChange={chatSkills.setSelectedSkillId}
                            messageListRef={messageListRef}
                            input={send.input}
                            sending={send.sending}
                            onInputChange={send.setInput}
                            onSend={() => void send.onSend()}
                            onStopStream={send.onStopStream}
                        />
                    )}
                </Content>
            </Layout>

            <CreateSessionModal
                open={sessions.createOpen}
                loading={sessions.createLoading}
                kbs={sessions.kbs}
                onCancel={() => sessions.setCreateOpen(false)}
                onSubmit={(v) => void sessions.onCreate(v)}
            />
        </div>
    );
}
