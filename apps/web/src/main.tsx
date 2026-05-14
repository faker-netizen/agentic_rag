import {createRoot} from "react-dom/client";
import "./index.css";
import {ConfigProvider} from "antd";
import {RouterProvider} from "react-router-dom";
import {router} from "./router";

createRoot(document.getElementById("root")!).render(
    <ConfigProvider>
        <RouterProvider router={router} />
    </ConfigProvider>,
);
