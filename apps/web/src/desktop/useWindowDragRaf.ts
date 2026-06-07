import {useCallback, useEffect, useRef, type RefObject} from "react";
import type {WindowPosition} from "./types.ts";

export function useWindowDragRaf(rootRef: RefObject<HTMLDivElement | null>) {
    const rafIdRef = useRef<number | null>(null);
    const pendingRef = useRef<WindowPosition | null>(null);

    const applyPending = useCallback(() => {
        rafIdRef.current = null;
        const el = rootRef.current;
        const pos = pendingRef.current;
        if (!el || !pos) return;
        el.style.left = `${pos.x}px`;
        el.style.top = `${pos.y}px`;
    }, [rootRef]);

    const scheduleUpdate = useCallback(
        (pos: WindowPosition) => {
            pendingRef.current = pos;
            if (rafIdRef.current != null) return;
            rafIdRef.current = requestAnimationFrame(applyPending);
        },
        [applyPending]
    );

    const cancelAndFlush = useCallback(() => {
        if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
        applyPending();
        const pos = pendingRef.current;
        pendingRef.current = null;
        rafIdRef.current = null;
        return pos;
    }, [applyPending]);

    useEffect(
        () => () => {
            if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
        },
        []
    );

    return {scheduleUpdate, cancelAndFlush};
}
