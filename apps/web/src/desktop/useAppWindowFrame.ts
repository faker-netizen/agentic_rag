import {useCallback, useEffect, useRef, useState} from "react";
import type {WindowInstance, WindowPosition} from "./types.ts";
import {useWindowDrag} from "./useWindowDrag.ts";

type UseAppWindowFrameOptions = {
    window: WindowInstance;
    moveWindow: (id: string, position: WindowPosition) => void;
    clearOpeningAnimation: (id: string) => void;
};

export function useAppWindowFrame({
    window,
    moveWindow,
    clearOpeningAnimation,
}: UseAppWindowFrameOptions) {
    const rootRef = useRef<HTMLDivElement>(null);
    const titlebarRef = useRef<HTMLElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const commitPosition = useCallback(
        (pos: WindowPosition) => {
            moveWindow(window.id, pos);
        },
        [moveWindow, window.id]
    );

    const positionRef = useRef(window.position);
    useEffect(() => {
        positionRef.current = window.position;
    }, [window.position]);

    const getPosition = useCallback(() => positionRef.current, []);

    const dragHandlers = useWindowDrag({
        rootRef,
        titlebarRef,
        getPosition,
        onCommit: commitPosition,
        onDraggingChange: setIsDragging,
    });

    useEffect(() => {
        if (isDragging || !rootRef.current) return;
        rootRef.current.style.left = `${window.position.x}px`;
        rootRef.current.style.top = `${window.position.y}px`;
    }, [window.position.x, window.position.y, isDragging]);

    useEffect(() => {
        if (!window.openingFrom || !rootRef.current) return;
        const el = rootRef.current;
        const centerX = window.position.x + window.rect.width / 2;
        const centerY = window.position.y + window.rect.height / 2;
        el.style.setProperty("--open-dx", `${window.openingFrom.dockX - centerX}px`);
        el.style.setProperty("--open-dy", `${window.openingFrom.dockY - centerY}px`);
        el.classList.add("app-window--opening");
        const onEnd = () => {
            el.classList.remove("app-window--opening");
            clearOpeningAnimation(window.id);
        };
        el.addEventListener("animationend", onEnd, {once: true});
        return () => el.removeEventListener("animationend", onEnd);
    }, [window.openingFrom, window.id, window.position, window.rect, clearOpeningAnimation]);

    return {
        rootRef,
        titlebarRef,
        isDragging,
        dragHandlers,
    };
}
