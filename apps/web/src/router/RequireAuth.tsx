import {Navigate, Outlet, useLocation} from "react-router-dom";
import {getAccessToken} from "@/service/token.ts";

/** 有 accessToken 才渲染子路由，否则跳转登录并带上回跳地址 */
export default function RequireAuth() {
    const location = useLocation();
    if (!getAccessToken()) {
        return <Navigate to="/login" replace state={{from: location.pathname + location.search}} />;
    }
    return <Outlet />;
}
