import {createBrowserRouter} from "react-router-dom";
import RootLayout from "../layout/RootLayout.tsx";
import Home from "../pages/home";
import Login from "../pages/login";
import NotFound from "../pages/notFound";
import {ApiOutlined, DatabaseOutlined, HomeOutlined, MessageOutlined, RobotOutlined} from "@ant-design/icons";
import Chat from "@/pages/chat";
import Typora from "@/pages/typora";
import KnowledgeBasesPage from "@/pages/knowledge-bases";
import RagPage from "@/pages/rag";
import AgentPage from "@/pages/agent";
import RequireAuth from "@/router/RequireAuth.tsx";

export const router = createBrowserRouter([
    {
        path: "/login",
        element: <Login />,
        handle: {menu: false},
    },
    {path: "/403", element: <NotFound />, handle: {menu: false}},
    {
        element: <RequireAuth />,
        children: [
            {
                path: "/",
                element: <RootLayout />,
                children: [
                    {
                        index: true,
                        element: <Home />,
                        handle: {title: "首页", icon: <HomeOutlined />, menu: true, order: 1},
                    },
                    {
                        path: "knowledge-bases",
                        element: <KnowledgeBasesPage />,
                        handle: {title: "知识库", icon: <DatabaseOutlined />, menu: true, order: 2},
                    },
                    {
                        path: "chat",
                        element: <Chat />,
                        handle: {title: "聊天", icon: <MessageOutlined />, menu: true, order: 3},
                    },
                    {
                        path: "rag",
                        element: <RagPage />,
                        handle: {title: "RAG", icon: <ApiOutlined />, menu: true, order: 4},
                    },
                    {
                        path: "agent",
                        element: <AgentPage />,
                        handle: {title: "Agent", icon: <RobotOutlined />, menu: true, order: 5},
                    },
                    {
                        path: "typora",
                        element: <Typora />,
                        handle: {title: "markdown", icon: <HomeOutlined />, menu: true, order: 6},
                    },
                    {
                        path: "*",
                        element: <NotFound />,
                        handle: {menu: false},
                    },
                ],
            },
        ],
    },
]);
