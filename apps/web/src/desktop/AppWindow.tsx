import {Suspense} from "react";
import {Spin} from "antd";
import {MacTrafficLights} from "@/components/shell";
import {APP_COMPONENTS} from "./appRegistry.tsx";
import {useAppWindowFrame} from "./useAppWindowFrame.ts";
import {useWindowManager} from "./useWindowManager.ts";
import {WindowContentContext} from "./windowContentContext.ts";
import type {WindowInstance} from "./types.ts";
import {useParams} from "react-router-dom";

type AppWindowProps = {
    window: WindowInstance;
};

export default function AppWindow({window}: AppWindowProps) {
    const {
        closeWindow,
        minimizeWindow,
        focusWindow,
        moveWindow,
        clearOpeningAnimation,
        focusedId,
    } = useWindowManager();
    const focused = focusedId === window.id;
    const AppComponent = APP_COMPONENTS[window.appId];

    const {rootRef, titlebarRef, isDragging, dragHandlers} =
        useAppWindowFrame({window, moveWindow, clearOpeningAnimation});

    function f(keyA:string,keyB:string,keyC:string,parms:any[]){}
             f('string','number','string',['a',1,'f'])

    return (
        <div
            ref={rootRef}
            className={[
                "app-window",
                focused && "app-window--focused",
                isDragging && "app-window--dragging",
                window.minimized && "app-window--minimized",
            ]
                .filter(Boolean)
                .join(" ")}
            style={{
                width: window.rect.width,
                height: window.rect.height,
                zIndex: window.minimized ? -1 : window.zIndex,
                ...(isDragging
                    ? {}
                    : {left: window.position.x, top: window.position.y}),
            }}
            aria-hidden={window.minimized || undefined}
            onMouseDown={() => {
                if (!window.minimized) focusWindow(window.id);
            }}
        >
            <div className="app-window__frame">
                <header
                    ref={titlebarRef}
                    className="app-window__titlebar app-window__titlebar--draggable"
                    onPointerDown={dragHandlers.onPointerDown}
                    onPointerMove={dragHandlers.onPointerMove}
                    onPointerUp={dragHandlers.onPointerUp}
                >
                    <div className="window-shell__titlebar-slot window-shell__titlebar-slot--left">
                        <MacTrafficLights
                            onClose={() => closeWindow(window.id)}
                            onMinimize={() => minimizeWindow(window.id)}
                        />
                    </div>
                    <div className="app-window__title">{window.title}</div>
                    <div
                        className="window-shell__titlebar-slot window-shell__titlebar-slot--right"
                        aria-hidden
                    />
                </header>
                <div className="app-window__body">
                    {AppComponent ? (
                        <WindowContentContext.Provider value={{meta: window.meta}}>
                            <Suspense
                                fallback={
                                    <div className="app-window__loading">
                                        <Spin />
                                    </div>
                                }
                            >
                                <AppComponent />
                            </Suspense>
                        </WindowContentContext.Provider>
                    ) : (
                        <div className="app-window__placeholder">即将推出</div>
                    )}
                </div>
            </div>
        </div>
    );
}
