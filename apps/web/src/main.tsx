import {createRoot} from "react-dom/client";
import "./theme/tokens.css";
import "./index.css";
import {ConfigProvider} from "antd";
import {RouterProvider} from "react-router-dom";
import {router} from "./router";
import {antdTheme} from "./theme";

createRoot(document.getElementById("root")!).render(
    <ConfigProvider theme={antdTheme}>
        <RouterProvider router={router} />
    </ConfigProvider>,
);
