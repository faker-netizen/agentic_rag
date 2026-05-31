import type {ReactNode} from "react";
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
                    {showTrafficLights && (
                        <div className="window-shell__traffic" aria-hidden>
                            <span className="window-shell__dot window-shell__dot--red" />
                            <span className="window-shell__dot window-shell__dot--yellow" />
                            <span className="window-shell__dot window-shell__dot--green" />
                        </div>
                    )}
                    <div className="window-shell__title">{title}</div>
                    {toolbar && <div className="window-shell__toolbar">{toolbar}</div>}
                </header>
                <div className="window-shell__body">{children}</div>
            </div>
        </div>
    );
}
