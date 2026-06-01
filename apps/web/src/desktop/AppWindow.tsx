import {Suspense} from "react";
import {Spin} from "antd";
import {APP_COMPONENTS} from "./appRegistry.tsx";
import {useWindowManager} from "./useWindowManager.ts";
import type {WindowInstance} from "./types.ts";

type AppWindowProps = {
    window: WindowInstance;
    stackIndex: number;
};

export default function AppWindow({window, stackIndex}: AppWindowProps) {
    const {closeWindow, focusWindow, focusedId} = useWindowManager();
    const focused = focusedId === window.id;
    const AppComponent = APP_COMPONENTS[window.appId];

    const offset = stackIndex * 28;

    return (
        <div
            className={["app-window", focused && "app-window--focused"].filter(Boolean).join(" ")}
            style={{
                width: window.rect.width,
                height: window.rect.height,
                zIndex: window.zIndex,
                transform: `translate(calc(-50% + ${offset}px), calc(-50% + ${offset}px))`,
            }}
            onMouseDown={() => focusWindow(window.id)}
        >
            <div className="app-window__frame">
                <header className="app-window__titlebar">
                    <div className="app-window__traffic">
                        <button
                            type="button"
                            className="app-window__dot app-window__dot--red"
                            aria-label="关闭"
                            onClick={() => closeWindow(window.id)}
                        />
                        <span className="app-window__dot app-window__dot--yellow" aria-hidden />
                        <span className="app-window__dot app-window__dot--green" aria-hidden />
                    </div>
                    <div className="app-window__title">{window.title}</div>
                </header>
                <div className="app-window__body">
                    {AppComponent ? (
                        <Suspense
                            fallback={
                                <div className="app-window__loading">
                                    <Spin />
                                </div>
                            }
                        >
                            <AppComponent />
                        </Suspense>
                    ) : (
                        <div className="app-window__placeholder">即将推出</div>
                    )}
                </div>
            </div>
        </div>
    );
}
