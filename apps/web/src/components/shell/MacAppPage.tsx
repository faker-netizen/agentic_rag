import type {ReactNode} from "react";
import "./shell.css";

export type MacAppPageProps = {
    toolbar?: ReactNode;
    children: ReactNode;
    className?: string;
    bodyClassName?: string;
};

/** Desktop App 内页标准布局：toolbar + 可滚动 body（不含交通灯） */
export default function MacAppPage({
    toolbar,
    children,
    className,
    bodyClassName,
}: MacAppPageProps) {
    return (
        <div className={["mac-app-page", className].filter(Boolean).join(" ")}>
            {toolbar}
            <div className={["mac-app-page__body", bodyClassName].filter(Boolean).join(" ")}>
                {children}
            </div>
        </div>
    );
}
