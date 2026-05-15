import React from 'react';
import {Outlet, useLocation, useMatches, useNavigate} from "react-router-dom";
import {Button, Layout, Menu, type MenuProps, theme, Typography} from "antd";
import {HomeOutlined, MenuFoldOutlined, MenuUnfoldOutlined, UserOutlined} from "@ant-design/icons";
import {useMemo, useState} from "react";
import type { ItemType } from "antd/es/menu/interface";
import {router} from "@/router";
import {clearAuth} from "@/service/token.ts";

const {Header, Content, Footer, Sider} = Layout

type Handle = {
    title?: string;
    icon?: React.ReactNode;
    menu?: boolean;
    order?: number;
};
const {Title} = Typography


function routesToMenuItems(routes: any[], parentPath = ""): ItemType[] {
    const items: ItemType[] = [];

    for (const r of routes) {
        const handle: Handle | undefined = r.handle;
        const show = handle?.menu !== false && !!handle?.title;

        // 计算完整路径：index 用 parentPath；子路由 path 用拼接
        const fullPath =
            r.index ? (parentPath || "/") :
                r.path?.startsWith("/") ? r.path :
                    (parentPath === "/" ? `/${r.path}` : `${parentPath}/${r.path}`);

        const children = r.children ? routesToMenuItems(r.children, fullPath) : undefined;

        if (show) {
            items.push({
                key: fullPath, // 用 path 当 key，点击直接 navigate
                icon: handle?.icon,
                label: handle?.title,
                children: children && children.length ? children : undefined,
            } as ItemType);
        } else {
            // 不显示在菜单，但它的 children 可能需要显示（可选策略）
            if (children?.length) items.push(...children);
        }
    }

    // 排序（可选）
    return items.sort((a: any, b: any) => (a?.order ?? 0) - (b?.order ?? 0));
}

function RootLayout() {
    const [collapsed, setCollapsed] = useState(false)
    const navigate = useNavigate()
    const location = useLocation()
    const matches = useMatches();
    const menuItems = useMemo(() => {
        // router.routes 是 Data Router 暴露的路由树
        return routesToMenuItems((router as any).routes, "");
    }, []);
    const {
        token: {colorBgContainer, borderRadiusLG},
    } = theme.useToken()

    // 用 matches 找到“最后一个有 title/menu 的路由”，作为选中项
    const selectedKey = useMemo(() => {
        const last = [...matches].reverse().find(m => {
            const h = m.handle as Handle | undefined;
            return h?.menu !== false && h?.title;
        });
        // last?.pathname 会是匹配到的实际 pathname（index 情况也OK）
        return last?.pathname ?? location.pathname;
    }, [matches, location.pathname]);


    return (
            <Layout>
                <Header
                    style={{
                        padding: '0 16px',
                        background: colorBgContainer,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        position: 'sticky',
                        top: 0,
                        zIndex: 10,
                        borderBottom: '1px solid rgba(0,0,0,0.06)',
                    }}
                >
                    <Button
                        type="text"
                        onClick={() => setCollapsed((v) => !v)}
                        icon={collapsed ? <MenuUnfoldOutlined/> : <MenuFoldOutlined/>}
                    />
                    <div style={{fontWeight: 600}}>Admin</div>
                    <div style={{marginLeft: 'auto', opacity: 0.7}}>
                        {location.pathname}
                    </div>
                    <div>
                        <Button
                            type="primary"
                            onClick={() => {
                                clearAuth();
                                navigate("/login", {replace: true});
                            }}
                        >
                            登出
                        </Button>
                    </div>
                </Header>
                <Layout>
                    <Sider>
                        <Menu
                            theme="dark"
                            mode="vertical"
                            items={menuItems}
                            selectedKeys={[selectedKey]}
                            onClick={(e) => navigate(e.key)}
                        />
                    </Sider>

                    <Content style={{padding: 16}}>
                        <div
                            style={{
                                background: colorBgContainer,
                                borderRadius: borderRadiusLG,
                                padding: 16,
                                height: 'calc(100vh - 64px - 32px)', // header + content padding
                            }}
                        >
                            <Outlet/>
                        </div>
                    </Content>
                </Layout>
            </Layout>

    )
}

export default RootLayout