import {useContext} from "react";
import {WindowManagerContext} from "./windowManagerContext.ts";

export function useWindowManager() {
    const ctx = useContext(WindowManagerContext);
    if (!ctx) throw new Error("useWindowManager must be used within WindowManagerProvider");
    return ctx;
}
