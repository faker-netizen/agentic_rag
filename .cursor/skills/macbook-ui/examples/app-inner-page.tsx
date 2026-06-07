/**
 * 桌面 App 内页 — 参考 apps/web/src/pages/chatpdf/
 * AppWindow 已提供交通灯；页面内只用 MacAppPage + MacToolbar，不要再套 WindowShell。
 */
import {MacAppPage, MacToolbar} from "@/components/shell";

type AppInnerPageExampleProps = {
    onUpload: () => void;
};

export function AppInnerPageExample({onUpload}: AppInnerPageExampleProps) {
    return (
        <MacAppPage
            toolbar={
                <MacToolbar>
                    <button type="button" className="mac-button" onClick={onUpload}>
                        上传 PDF
                    </button>
                </MacToolbar>
            }
        >
            {/* mac-app-page__body 已由 MacAppPage 提供，直接写横向布局 */}
            <div style={{flex: 1, minHeight: 0, display: "flex", overflow: "hidden"}}>
                {/* 主内容区 flex: 1 */}
                <section className="mac-scrollbar" style={{flex: 1, minWidth: 0, overflow: "auto"}}>
                    <p style={{padding: 16, fontSize: "var(--text-base)"}}>文档预览区</p>
                </section>

                {/* 右侧面板固定宽度 */}
                <aside
                    style={{
                        width: "var(--mac-list-panel-width)",
                        flexShrink: 0,
                        borderLeft: "1px solid var(--color-border-subtle)",
                    }}
                >
                    <header
                        style={{
                            padding: "12px 16px",
                            fontSize: "var(--text-base)",
                            fontWeight: "var(--font-semibold)",
                            borderBottom: "1px solid var(--color-border-subtle)",
                        }}
                    >
                        AI 摘要
                    </header>
                    <div className="mac-scrollbar" style={{padding: 16, overflow: "auto"}}>
                        摘要内容…
                    </div>
                </aside>
            </div>
        </MacAppPage>
    );
}
