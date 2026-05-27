import {useCallback, useEffect, useRef, useState} from "react";

/**
 * 流式文本缓冲：token 先写入 ref，每帧最多 setState 一次，供 Markdown 等同一路径渲染。
 */
export function useRafStreamBuffer(onFrame?: () => void) {
    const accRef = useRef("");
    const [display, setDisplay] = useState("");
    const rafRef = useRef<number | null>(null);

    const cancelRaf = useCallback(() => {
        if (rafRef.current != null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
    }, []);

    const flushToDisplay = useCallback(() => {
        setDisplay(accRef.current);
        onFrame?.();
    }, [onFrame]);

    const schedule = useCallback(() => {
        if (rafRef.current != null) return;
        rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null;
            flushToDisplay();
        });
    }, [flushToDisplay]);

    const append = useCallback(
        (delta: string) => {
            if (!delta) return;
            accRef.current += delta;
            schedule();
        },
        [schedule]
    );

    /** 立即把缓冲区同步到 display；可传入终稿覆盖 acc */
    const flush = useCallback(
        (finalText?: string) => {
            cancelRaf();
            if (finalText !== undefined) accRef.current = finalText;
            flushToDisplay();
        },
        [cancelRaf, flushToDisplay]
    );

    const reset = useCallback(() => {
        cancelRaf();
        accRef.current = "";
        setDisplay("");
    }, [cancelRaf]);

    useEffect(() => cancelRaf, [cancelRaf]);

    return {display, append, flush, reset, getAccumulated: () => accRef.current};
}
