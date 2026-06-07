import type {ReactNode} from "react";
import MacTrafficLights from "./MacTrafficLights.tsx";
import "./shell.css";

export interface WindowShellProps {
    title: string;
    toolbar?: ReactNode;
    showTrafficLights?: boolean;
    children: ReactNode;
    className?: string;
}

export default function WindowShell({
    title,
    toolbar,
    showTrafficLights = true,
    children,
    className,
}: WindowShellProps) {
    return (
        <div className={["window-shell", className].filter(Boolean).join(" ")}>
            <div className="window-shell__frame">
                <header className="window-shell__titlebar">
                    <div className="window-shell__titlebar-slot window-shell__titlebar-slot--left">
                        {showTrafficLights ? <MacTrafficLights /> : null}
                    </div>
                    <div className="window-shell__title">{title}</div>
                    <div className="window-shell__titlebar-slot window-shell__titlebar-slot--right">
                        {toolbar ? <div className="window-shell__toolbar">{toolbar}</div> : null}
                    </div>
                </header>
                <div className="window-shell__body">{children}</div>
            </div>
        </div>
    );
}
