import React, {useEffect, useMemo, useRef, useState} from "react";


export type VirtualListProps<T> = {
    items: T[];
    height: number;        // 视口高度
    itemHeight: number;    // 每行固定高度
    overscan?: number;     // 上下多渲染几行，避免白屏
    renderItem: (item: T, index: number) => React.ReactNode;
    className?: string;
    getKey?: (item: T, index: number) => React.Key
};

export function VirtualList<T>({
                                   items,
                                   height,
                                   itemHeight,
                                   overscan = 10,
                                   renderItem,
                                   className,
                                   getKey = undefined
                               }: VirtualListProps<T>) {
    const viewportRef = useRef<HTMLDivElement | null>(null)
    const rafIdRef = useRef<number | null>(null)

    const [scrollTop, setScrollTop] = useState(0)
    const totalHeight = itemHeight * items.length
    const {start, end, offsetY} = useMemo(() => {
        const viewportItemCount = Math.ceil(height / itemHeight);
        const startIndex = Math.floor(scrollTop / itemHeight);
        const endIndex = startIndex + viewportItemCount - 1;
        const s = Math.max(0, startIndex - overscan)
        const e = Math.min(items.length - 1, endIndex + overscan)
        return {
            start: s,
            end: e,
            offsetY: s * itemHeight
        }
    }, [scrollTop, height, items.length, overscan, itemHeight])
    const visibleItems = useMemo(() => {
        if (items.length === 0) return []
        return items.slice(start, end + 1)
    }, [start, end, items])
    useEffect(() => {
        const el = viewportRef.current
        if (!el) return
        const onScroll = () => {
            if (rafIdRef.current !== null) return
            rafIdRef.current = requestAnimationFrame(() => {
                rafIdRef.current = null
                setScrollTop(el.scrollTop)
            })
        }
        el.addEventListener("scroll", onScroll, {passive: true})
        return () => {
            el.removeEventListener('scroll', onScroll)
            if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current)
        }
    }, []);
    return (
        <div
            ref={viewportRef}
            className={className}
            style={{
                height,
                overflow: "auto",
                position: "relative",
                border: '1px solid red',
                borderRadius: 10
            }}
        >
            <div style={{height: totalHeight, position: 'relative'}}>
                <div style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    right: 0,
                    transform: `translateY(${offsetY}px)`,
                    willChange: 'transform'
                }}>
                    {visibleItems.map((item, i) => {
                        const index = start + i
                        return (
                            <div
                                key={getKey?(getKey(item,i)):index}
                                style={{
                                    height: itemHeight,
                                    boxSizing: 'border-box',
                                    borderBottom: '1px solid blue',
                                    display: "flex",
                                    alignItems: 'center',
                                    padding: '0 12px',
                                    background: index % 2 ? "#fff" : "#fafafa"
                                }}
                            > {renderItem(item, index)}</div>
                        )
                    })}
                </div>

            </div>

        </div>
    )

}

export default VirtualList