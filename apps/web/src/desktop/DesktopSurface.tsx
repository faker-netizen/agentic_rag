import {FolderFilled} from "@ant-design/icons";
import {Empty, Spin} from "antd";
import {useDesktopKnowledgeBases} from "./desktopKnowledgeBaseContext.ts";
import {useWindowManager} from "./useWindowManager.ts";

export default function DesktopSurface() {
    const {kbs, loading} = useDesktopKnowledgeBases();
    const {openKnowledgeBase, isKnowledgeBaseOpen} = useWindowManager();

    return (
        <div className="desktop-surface">
            {loading && kbs.length === 0 ? (
                <div className="desktop-surface__loading">
                    <Spin />
                </div>
            ) : kbs.length === 0 ? (
                <div className="desktop-surface__empty">
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="暂无知识库，请从顶部菜单栏创建"
                        className="desktop-surface__empty-inner"
                    />
                </div>
            ) : (
                <ul className="desktop-icons">
                    {kbs.map((kb) => {
                        const open = isKnowledgeBaseOpen(kb.id);
                        return (
                            <li key={kb.id}>
                                <button
                                    type="button"
                                    className={[
                                        "desktop-icon",
                                        open && "desktop-icon--open",
                                    ]
                                        .filter(Boolean)
                                        .join(" ")}
                                    onClick={() => openKnowledgeBase({id: kb.id, name: kb.name})}
                                    title={kb.description ?? kb.name}
                                >
                                    <div className="desktop-icon__glyph">
                                        <FolderFilled />
                                    </div>
                                    <span className="desktop-icon__label">{kb.name}</span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
