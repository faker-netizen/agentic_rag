import {memo, useMemo} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import {theme} from "antd";
import type {Components} from "react-markdown";
import "./markdown.css";

export type MarkdownContentProps = {
    content: string;
    className?: string;
    style?: React.CSSProperties;
};

function MarkdownContentInner({content, className, style}: MarkdownContentProps) {
    const {token} = theme.useToken();

    const cssVars = useMemo(
        () =>
            ({
                "--md-border": token.colorBorderSecondary,
                "--md-muted": token.colorTextSecondary,
                "--md-quote-bg": token.colorFillAlter,
                "--md-code-bg": token.colorFillTertiary,
                "--md-pre-bg": token.colorFillQuaternary,
                "--md-table-head": token.colorFillAlter,
                "--md-link": token.colorLink,
            }) as React.CSSProperties,
        [token]
    );

    const components = useMemo<Components>(
        () => ({
            a: ({href, children, ...rest}) => (
                <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
                    {children}
                </a>
            ),
        }),
        []
    );

    const text = content?.trim() ?? "";
    if (!text) return null;

    return (
        <div className={["md-content", className].filter(Boolean).join(" ")} style={{...cssVars, ...style}}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]} components={components}>
                {content}
            </ReactMarkdown>
        </div>
    );
}

/** 内容不变时不重复解析 Markdown（配合流式结束后再挂载） */
const MarkdownContent = memo(MarkdownContentInner, (prev, next) => {
    return prev.content === next.content && prev.className === next.className;
});

export default MarkdownContent;
export {StreamingPlainContent, type StreamingPlainHandle} from "./StreamingPlainContent.tsx";
