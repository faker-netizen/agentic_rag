import {createBrowserRouter, Navigate} from "react-router-dom";
import RootLayout from "../layout/RootLayout.tsx";
import Home from "../pages/home";
import Login from "../pages/login";
import NotFound from "../pages/notFound";
import {HomeOutlined} from "@ant-design/icons";
import Chat from "@/pages/chat";
import Typora from "@/pages/typora";


export const router = createBrowserRouter([
    // 登录页：独立界面，不套 Layout
    {
        path: '/login', element: <Login/>,
        handle: {
            menu: false
        }
    },

    // 403
    {path: '/403', element: <NotFound/>, handle: {menu: false}},
    {
        path: '/',
        element: <RootLayout/>,
        children: [
            {index: true, element: <Home/>, handle: {title: "首页", icon: <HomeOutlined/>, menu: true, order: 1},},
            {path: '/chat', element: <Chat/>, handle: {title: "聊天", icon: <HomeOutlined/>, menu: true, order: 1},},
            {path: '/typora', element: <Typora/>, handle: {title: "markdown", icon: <HomeOutlined/>, menu: true, order: 1},},
            // {path: 'home', element: <Navigate to="/" replace/>}, // 示例：重定向
            // {path: 'home', element: <Home/>},
            {
                path: "*",
                element: <NotFound/>,
                handle: {menu: false},
            },
        ]
    },
])