import {useEffect, useRef} from "react";
import {useSearchParams} from "react-router-dom";
import DesktopSurface from "./DesktopSurface.tsx";
import Dock from "./Dock.tsx";
import MenuBar from "./MenuBar.tsx";
import WindowLayer from "./WindowLayer.tsx";
import {WindowManagerProvider} from "./windowManager.tsx";
import {useWindowManager} from "./useWindowManager.ts";
import "./desktop.css";

function DesktopShellInner() {
    const [searchParams, setSearchParams] = useSearchParams();
    const {openApp} = useWindowManager();
    const handledDeepLink = useRef(false);

    useEffect(() => {
        if (handledDeepLink.current) return;
        if (searchParams.get("open") !== "chat") return;
        handledDeepLink.current = true;
        openApp("chat");
        setSearchParams({}, {replace: true});
    }, [openApp, searchParams, setSearchParams]);

    return (
        <div className="desktop">
            <MenuBar />
            <DesktopSurface />
            <WindowLayer />
            <Dock />
        </div>
    );
}

export default function DesktopShell() {
    return (
        <WindowManagerProvider>
            <DesktopShellInner />
        </WindowManagerProvider>
    );
}
