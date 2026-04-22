import {StrictMode} from 'react'
import {createRoot}  from 'react-dom/client'
import './index.css'
import {ConfigProvider} from "antd";
import {Provider} from "react-redux";
import {store} from "./app/store.ts";
import {RouterProvider} from "react-router-dom";
import {router} from "./router";
createRoot(document.getElementById('root')!).render(
    // <StrictMode>
        <Provider store={store}>
            <ConfigProvider>
                <RouterProvider router={router}/>
            </ConfigProvider>
        </Provider>
    // </StrictMode>
,
)
