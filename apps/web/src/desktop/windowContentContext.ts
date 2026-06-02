import {createContext, useContext} from "react";
import type {WindowMeta} from "./types.ts";

export type WindowContentContextValue = {
    meta?: WindowMeta;
};

export const WindowContentContext = createContext<WindowContentContextValue>({});

export function useWindowContentMeta(): WindowMeta | undefined {
    return useContext(WindowContentContext).meta;
}
