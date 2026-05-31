import {createBrowserRouter, Navigate} from "react-router-dom";
import RequireAuth from "@/router/RequireAuth.tsx";
import {lazyLoad} from "@/router/lazyLoad.tsx";
import {DesktopShell, Login, NotFound} from "@/router/lazyPages.ts";

export const router = createBrowserRouter([
    {
        path: "/login",
        element: lazyLoad(Login),
    },
    {path: "/403", element: lazyLoad(NotFound)},
    {
        element: <RequireAuth/>,
        children: [
            {
                path: "/",
                element: lazyLoad(DesktopShell),
            },
            {
                path: "/chat",
                element: <Navigate to="/?open=chat" replace/>,
            },
            {
                path: "*",
                element: lazyLoad(NotFound),
            },
        ],
    },
]);
