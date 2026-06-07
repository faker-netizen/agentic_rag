/**
 * System Settings 风格设置页 — 左导航 + 右分组表单
 * 可放在 WindowShell 内容区或 MacAppPage body 内。
 */
import {MacSidebar} from "@/components/shell";
import {Layout, Menu} from "antd";

const {Content} = Layout;

const SETTINGS_GROUPS = [
    {
        title: "通用",
        rows: [
            {label: "语言", value: "简体中文"},
            {label: "主题", value: "跟随系统"},
        ],
    },
    {
        title: "账户",
        rows: [
            {label: "邮箱", value: "user@example.com"},
            {label: "登出", value: "→"},
        ],
    },
];

export function SettingsPageExample() {
    return (
        <Layout className="window-shell__layout" style={{height: "100%"}}>
            <MacSidebar width={240}>
                <Menu
                    className="mac-menu"
                    theme="light"
                    mode="inline"
                    defaultSelectedKeys={["general"]}
                    items={[
                        {key: "general", label: "通用"},
                        {key: "account", label: "账户"},
                    ]}
                />
            </MacSidebar>

            <Content className="window-shell__content mac-scrollbar">
                <div style={{maxWidth: 760, padding: "28px 24px"}}>
                    <h1
                        style={{
                            margin: "0 0 22px",
                            fontSize: "var(--text-title)",
                            fontWeight: 650,
                        }}
                    >
                        通用
                    </h1>

                    {SETTINGS_GROUPS.map((group) => (
                        <section
                            key={group.title}
                            style={{
                                marginBottom: 18,
                                borderRadius: "var(--radius-lg)",
                                background: "var(--mac-card-bg)",
                                border: "1px solid var(--color-border-subtle)",
                                overflow: "hidden",
                            }}
                        >
                            {group.rows.map((row, index) => (
                                <div
                                    key={row.label}
                                    style={{
                                        minHeight: 48,
                                        padding: "10px 14px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        fontSize: "var(--text-base)",
                                        borderTop:
                                            index > 0
                                                ? "1px solid var(--color-border-subtle)"
                                                : undefined,
                                    }}
                                >
                                    <span>{row.label}</span>
                                    <span style={{color: "var(--color-text-secondary)"}}>
                                        {row.value}
                                    </span>
                                </div>
                            ))}
                        </section>
                    ))}
                </div>
            </Content>
        </Layout>
    );
}
