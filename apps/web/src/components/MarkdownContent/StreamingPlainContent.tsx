import {forwardRef, memo, useEffect, useImperativeHandle, useRef} from "react";
import "./markdown.css";

const CURSOR = "\u258c";

export type StreamingPlainHandle = {
    /** 追加增量文本：仅向 DOM 插入新 Text 节点，不触碰已有节点 */
    append: (delta: string) => void;
    reset: () => void;
    getContent: () => string;
};

type StreamingPlainContentProps = {
    onAppend?: () => void;
};

const StreamingPlainContentBase = forwardRef<StreamingPlainHandle, StreamingPlainContentProps>(
    function StreamingPlainContentBase({onAppend}, ref) {
        const hostRef = useRef<HTMLDivElement>(null);
        const accRef = useRef("");
        const hasCursorRef = useRef(true);

        const showCursor = () => {
            const host = hostRef.current;
            if (!host) return;
            host.replaceChildren();
            host.appendChild(document.createTextNode(CURSOR));
            hasCursorRef.current = true;
        };

        useImperativeHandle(
            ref,
            () => ({
                append(delta: string) {
                    if (!delta) return;
                    const host = hostRef.current;
                    if (!host) return;

                    if (hasCursorRef.current) {
                        host.replaceChildren();
                        hasCursorRef.current = false;
                    }

                    accRef.current += delta;
                    host.appendChild(document.createTextNode(delta));
                    onAppend?.();
                },
                reset() {
                    accRef.current = "";
                    showCursor();
                },
                getContent: () => accRef.current,
            }),
            [onAppend]
        );

        useEffect(() => {
            showCursor();
        }, []);

        return (
            <div
                ref={hostRef}
                className="md-content chat-message-plain"
                aria-live="polite"
                aria-busy="true"
            />
        );
    }
);

/**
 * 流式阶段专用：token 经 ref.append 直接进 DOM，父组件 re-render 不会重建已显示内容。
 */
export const StreamingPlainContent = memo(StreamingPlainContentBase, () => true);
