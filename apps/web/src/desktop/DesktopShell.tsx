import {useEffect, useMemo, useRef} from "react";
import {useSearchParams} from "react-router-dom";
import {useKnowledgeBaseList} from "@/hooks/useKnowledgeBaseList.ts";
import DesktopSurface from "./DesktopSurface.tsx";
import Dock from "./Dock.tsx";
import MenuBar from "./MenuBar.tsx";
import WindowLayer from "./WindowLayer.tsx";
import {DesktopKnowledgeBaseContext} from "./desktopKnowledgeBaseContext.ts";
import {WindowManagerProvider} from "./windowManager.tsx";
import {useWindowManager} from "./useWindowManager.ts";
import "./desktop.css";

function DesktopShellInner() {
    const [searchParams, setSearchParams] = useSearchParams();
    const {openApp} = useWindowManager();
    const handledDeepLink = useRef(false);
    const kbState = useKnowledgeBaseList();

    const kbContextValue = useMemo(
        () => ({
            kbs: kbState.kbs,
            loading: kbState.loading,
            refresh: kbState.refresh,
        }),
        [kbState.kbs, kbState.loading, kbState.refresh]
    );

    useEffect(() => {
        if (handledDeepLink.current) return;
        if (searchParams.get("open") !== "chat") return;
        handledDeepLink.current = true;
        openApp("chat");
        setSearchParams({}, {replace: true});
    }, [openApp, searchParams, setSearchParams]);

    return (
        <DesktopKnowledgeBaseContext.Provider value={kbContextValue}>
            <div className="desktop">
                <MenuBar />
                <DesktopSurface />
                <WindowLayer />
                <Dock />
            </div>
        </DesktopKnowledgeBaseContext.Provider>
    );
}

export default function DesktopShell() {
    return (
        <WindowManagerProvider>
            <DesktopShellInner />
        </WindowManagerProvider>
    );
}
