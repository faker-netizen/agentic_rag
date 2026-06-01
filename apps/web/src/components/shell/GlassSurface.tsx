import type {CSSProperties, ReactNode} from "react";
import "./shell.css";

type GlassVariant = "panel" | "subtle" | "strong";
type GlassPadding = "none" | "sm" | "md" | "lg";

export interface GlassSurfaceProps {
    variant?: GlassVariant;
    padding?: GlassPadding;
    flex?: boolean;
    className?: string;
    style?: CSSProperties;
    children: ReactNode;
}

export default function GlassSurface({
    variant = "panel",
    padding = "md",
    flex = false,
    className,
    style,
    children,
}: GlassSurfaceProps) {
    const classes = [
        "glass-surface",
        `glass-surface--${variant}`,
        `glass-surface--padding-${padding}`,
        flex && "glass-surface--flex",
        className,
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <div className={classes} style={style}>
            {children}
        </div>
    );
}
