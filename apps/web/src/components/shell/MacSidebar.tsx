import type {ReactNode} from "react";
import {Layout} from "antd";
import "./shell.css";

const {Sider} = Layout;

export type MacSidebarProps = {
    children: ReactNode;
    width?: number;
    collapsed?: boolean;
    className?: string;
};

export default function MacSidebar({
    children,
    width = 220,
    collapsed,
    className,
}: MacSidebarProps) {
    return (
        <Sider
            theme="light"
            width={width}
            collapsed={collapsed}
            trigger={null}
            className={["window-shell__sidebar", className].filter(Boolean).join(" ")}
        >
            {children}
        </Sider>
    );
}
