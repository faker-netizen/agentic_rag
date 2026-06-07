import type {ReactNode} from "react";
import "./shell.css";

export type MacToolbarProps = {
    children: ReactNode;
    className?: string;
};

export default function MacToolbar({children, className}: MacToolbarProps) {
    return (
        <header className={["mac-app-toolbar", className].filter(Boolean).join(" ")}>
            {children}
        </header>
    );
}
