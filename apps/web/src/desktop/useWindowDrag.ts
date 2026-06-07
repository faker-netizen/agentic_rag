import {useCallback, useEffect, useRef, type RefObject} from "react";
import {useWindowDragRaf} from "./useWindowDragRaf.ts";
import type {WindowPosition} from "./types.ts";

type DragState = {
    startX: number;
    startY: number;
    originX: number;
    originY: number;
};

type UseWindowDragOptions = {
    rootRef: RefObject<HTMLDivElement | null>;
    titlebarRef: RefObject<HTMLElement | null>;
    getPosition: () => WindowPosition;
    onCommit: (pos: WindowPosition) => void;
    onDraggingChange?: (dragging: boolean) => void;
};

export function useWindowDrag(options: UseWindowDragOptions) {
    const {rootRef, titlebarRef, getPosition, onCommit, onDraggingChange} = options;
    const dragRef = useRef<DragState | null>(null);
    const onCommitRef = useRef(onCommit);
    const onDraggingChangeRef = useRef(onDraggingChange);
    const getPositionRef = useRef(getPosition);
    const {scheduleUpdate, cancelAndFlush} = useWindowDragRaf(rootRef);

    useEffect(() => {
        onCommitRef.current = onCommit;
        onDraggingChangeRef.current = onDraggingChange;
        getPositionRef.current = getPosition;
    }, [onCommit, onDraggingChange, getPosition]);

    const onPointerDown = useCallback(
        (event: React.PointerEvent<HTMLElement>) => {
            if (event.button !== 0 || (event.target as HTMLElement).closest("button")) return;
            const el = rootRef.current;
            if (!el) return;
            const {x: originX, y: originY} = getPositionRef.current();
            dragRef.current = {startX: event.clientX, startY: event.clientY, originX, originY};
            scheduleUpdate({x: originX, y: originY});
            el.classList.add("app-window--dragging");
            onDraggingChangeRef.current?.(true);
            titlebarRef.current?.setPointerCapture(event.pointerId);
            event.preventDefault();
        },
        [rootRef, scheduleUpdate, titlebarRef]
    );

    const onPointerMove = useCallback(
        (event: React.PointerEvent<HTMLElement>) => {
            const drag = dragRef.current;
            if (!drag) return;
            scheduleUpdate({
                x: Math.max(0, Math.round(drag.originX + event.clientX - drag.startX)),
                y: Math.max(0, Math.round(drag.originY + event.clientY - drag.startY)),
            });
        },
        [scheduleUpdate]
    );

    const onPointerUp = useCallback(
        (event: React.PointerEvent<HTMLElement>) => {
            const drag = dragRef.current;
            if (!drag) return;
            const finalPos = cancelAndFlush() ?? {x: drag.originX, y: drag.originY};
            dragRef.current = null;
            rootRef.current?.classList.remove("app-window--dragging");
            onDraggingChangeRef.current?.(false);
            titlebarRef.current?.releasePointerCapture(event.pointerId);
            onCommitRef.current(finalPos);
        },
        [cancelAndFlush, rootRef, titlebarRef]
    );

    return {onPointerDown, onPointerMove, onPointerUp};
}
