/**
 * 路由页标准布局 — 参考 apps/web/src/layout/RootLayout.tsx
 * 用于 /chat、/kb 等通过 react-router 渲染的全屏窗口页。
 */
import {Button, Layout, Menu} from "antd";
import {Outlet, useNavigate} from "react-router-dom";
import {GlassSurface, MacSidebar, WindowShell} from "@/components/shell";

const {Content} = Layout;

export function RoutePageLayoutExample() {
    const navigate = useNavigate();

    return (
        <div className="app-backdrop">
            <WindowShell
                title="Design to Code"
                toolbar={
                    <>
                        <Button type="text" size="small">
                            折叠
                        </Button>
                        <Button type="primary" size="small">
                            操作
                        </Button>
                    </>
                }
            >
                <Layout className="window-shell__layout">
                    <MacSidebar>
                        <Menu
                            className="mac-menu"
                            theme="light"
                            mode="inline"
                            items={[
                                {key: "/chat", label: "聊天"},
                                {key: "/kb", label: "知识库"},
                            ]}
                            onClick={(e) => navigate(e.key)}
                        />
                    </MacSidebar>

                    <Content className="window-shell__content">
                        <GlassSurface variant="panel" padding="none" flex>
                            <Outlet />
                        </GlassSurface>
                    </Content>
                </Layout>
            </WindowShell>
        </div>
    );
}
