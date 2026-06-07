import React, {useMemo, useState} from "react";
import {Outlet, useLocation, useMatches, useNavigate} from "react-router-dom";
import {Button, Layout, Menu, type MenuProps} from "antd";
import {MenuFoldOutlined, MenuUnfoldOutlined} from "@ant-design/icons";
import type {ItemType} from "antd/es/menu/interface";
import {router} from "@/router";
import {clearAuth} from "@/service/token.ts";
import {MacSidebar, WindowShell} from "@/components/shell";

const {Content} = Layout;

type Handle = {
    title?: string;
    icon?: React.ReactNode;
    menu?: boolean;
    order?: number;
};

function routesToMenuItems(routes: any[], parentPath = ""): ItemType[] {
    const items: ItemType[] = [];

    for (const r of routes) {
        const handle: Handle | undefined = r.handle;
        const show = handle?.menu !== false && !!handle?.title;

        const fullPath =
            r.index ? (parentPath || "/") :
                r.path?.startsWith("/") ? r.path :
                    (parentPath === "/" ? `/${r.path}` : `${parentPath}/${r.path}`);

        const children = r.children ? routesToMenuItems(r.children, fullPath) : undefined;

        if (show) {
            items.push({
                key: fullPath,
                icon: handle?.icon,
                label: handle?.title,
                order: handle?.order ?? 0,
                children: children && children.length ? children : undefined,
            } as ItemType);
        } else if (children?.length) {
            items.push(...children);
        }
    }

    return items.sort((a, b) => ((a as {order?: number}).order ?? 0) - ((b as {order?: number}).order ?? 0));
}

function RootLayout() {
    const [collapsed, setCollapsed] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const matches = useMatches();

    const menuItems = useMemo(() => routesToMenuItems((router as any).routes, ""), []);

    const selectedKey = useMemo(() => {
        const last = [...matches].reverse().find((m) => {
            const h = m.handle as Handle | undefined;
            return h?.menu !== false && h?.title;
        });
        return last?.pathname ?? location.pathname;
    }, [matches, location.pathname]);

    return (
        <div className="app-backdrop">
            <WindowShell
                title="Design to Code"
                toolbar={
                    <>
                        <Button
                            type="text"
                            size="small"
                            onClick={() => setCollapsed((v) => !v)}
                            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                        />
                        <span className="window-shell__path">{location.pathname}</span>
                        <Button
                            type="primary"
                            size="small"
                            onClick={() => {
                                clearAuth();
                                navigate("/login", {replace: true});
                            }}
                        >
                            登出
                        </Button>
                    </>
                }
            >
                <Layout className="window-shell__layout">
                    <MacSidebar collapsed={collapsed}>
                        <Menu
                            className="mac-menu"
                            theme="light"
                            mode="inline"
                            items={menuItems}
                            selectedKeys={[selectedKey]}
                            onClick={(e) => navigate(e.key)}
                        />
                    </MacSidebar>

                    <Content className="window-shell__content mac-scrollbar">
                        <Outlet />
                    </Content>
                </Layout>
            </WindowShell>
        </div>
    );
}

export default RootLayout;
