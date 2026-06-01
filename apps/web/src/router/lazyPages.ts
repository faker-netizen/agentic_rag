import {lazy} from "react";

export const Login = lazy(() => import("../pages/login"));
export const DesktopShell = lazy(() => import("../desktop/DesktopShell.tsx"));
export const NotFound = lazy(() => import("../pages/notFound"));

/** @deprecated 旧 Admin 路由，保留模块供窗口内 lazy 加载 */
export const Home = lazy(() => import("../pages/home"));
export const KnowledgeBasesPage = lazy(() => import("../pages/knowledge-bases"));
export const Chat = lazy(() => import("../pages/chat"));
export const Typora = lazy(() => import("../pages/typora"));
