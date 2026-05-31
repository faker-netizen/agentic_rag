import type {ThemeConfig} from "antd";

export const antdTheme: ThemeConfig = {
    token: {
        colorPrimary: "#007AFF",
        borderRadius: 8,
        borderRadiusLG: 16,
        colorBgLayout: "#f4f4f5",
        colorBorderSecondary: "rgba(0, 0, 0, 0.06)",
        boxShadowSecondary: "0 8px 32px rgba(0, 0, 0, 0.08)",
        fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
        motionDurationMid: "0.2s",
    },
    components: {
        Menu: {
            itemBorderRadius: 8,
            itemMarginInline: 8,
            itemHeight: 40,
            activeBarBorderWidth: 0,
        },
        Card: {
            borderRadiusLG: 16,
        },
        Button: {
            controlHeight: 36,
            borderRadius: 8,
        },
        Layout: {
            headerBg: "transparent",
            siderBg: "transparent",
            bodyBg: "transparent",
        },
        Input: {
            borderRadius: 8,
        },
    },
};
