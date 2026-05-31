import React, { Suspense } from "react"

export function lazyLoad(Component: React.LazyExoticComponent<any>) {
    return (
        <Suspense fallback={<div>页面加载中...</div>}>
            <Component />
        </Suspense>
    )
}
