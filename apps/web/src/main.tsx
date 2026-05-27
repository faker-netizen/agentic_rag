import {createRoot} from "react-dom/client";
import "./index.css";
import {ConfigProvider} from "antd";
import {RouterProvider} from "react-router-dom";
import {router} from "./router";

createRoot(document.getElementById("root")!).render(
    <ConfigProvider
        theme={{
            // token: {
            //     // Seed Token, affects wide range
            //     colorPrimary: '#00b96b',
            //     borderRadius: 2,
            //
            //     // Derived token, affects narrow range
            //     // colorBgContainer: '#f6ffed',
            // },
        }}
    >
        <RouterProvider router={router} />
    </ConfigProvider>,
);
