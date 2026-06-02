import {useState} from "react";
import {Button, message} from "antd";
import {PlusOutlined} from "@ant-design/icons";
import {useNavigate} from "react-router-dom";
import CreateKnowledgeBaseModal from "@/components/knowledge-base/CreateKnowledgeBaseModal.tsx";
import {useCreateKnowledgeBase} from "@/hooks/useKnowledgeBaseList.ts";
import {clearAuth} from "@/service/token.ts";
import {useDesktopKnowledgeBases} from "./desktopKnowledgeBaseContext.ts";
import {useWindowManager} from "./useWindowManager.ts";

export default function MenuBar() {
    const navigate = useNavigate();
    const {refresh} = useDesktopKnowledgeBases();
    const {openKnowledgeBase} = useWindowManager();
    const [createOpen, setCreateOpen] = useState(false);

    const {create, submitting} = useCreateKnowledgeBase();

    const onCreateSubmit = async (name: string, description?: string) => {
        try {
            const id = await create(name, description);
            message.success("知识库已创建");
            setCreateOpen(false);
            const list = await refresh();
            const kb = list.find((k) => k.id === id);
            if (kb) {
                openKnowledgeBase({id: kb.id, name: kb.name});
            }
        } catch (e) {
            message.error(e instanceof Error ? e.message : "创建失败");
            throw e;
        }
    };

    return (
        <>
            <header className="desktop-menubar">
                <div className="desktop-menubar__brand">文档 AI 工作台</div>
                <nav className="desktop-menubar__menu" aria-label="主菜单">
                    <Button
                        type="text"
                        size="small"
                        className="desktop-menubar__menu-item"
                        icon={<PlusOutlined />}
                        onClick={() => setCreateOpen(true)}
                    >
                        新建知识库
                    </Button>
                </nav>
                <div className="desktop-menubar__spacer" />
                <Button
                    type="text"
                    size="small"
                    className="desktop-menubar__action"
                    onClick={() => {
                        clearAuth();
                        navigate("/login", {replace: true});
                    }}
                >
                    登出
                </Button>
            </header>

            <CreateKnowledgeBaseModal
                open={createOpen}
                submitting={submitting}
                onCancel={() => setCreateOpen(false)}
                onSubmit={onCreateSubmit}
            />
        </>
    );
}
