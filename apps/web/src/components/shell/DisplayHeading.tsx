import type {ReactNode} from "react";
import "./shell.css";

export interface DisplayHeadingProps {
    level?: 1 | 2 | 3;
    align?: "left" | "center";
    subtitle?: ReactNode;
    children: ReactNode;
    className?: string;
}

export default function DisplayHeading({
    level = 2,
    align = "left",
    subtitle,
    children,
    className,
}: DisplayHeadingProps) {
    const Tag = level === 1 ? "h1" : level === 3 ? "h3" : "h2";
    const classes = [
        "display-heading",
        `display-heading--${level}`,
        align === "center" && "display-heading--center",
        className,
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <Tag className={classes}>
            {children}
            {subtitle && <span className="display-heading__subtitle">{subtitle}</span>}
        </Tag>
    );
}
