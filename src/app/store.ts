import { configureStore } from '@reduxjs/toolkit'
import authReducer from '../features/auth/authSlice'
import {api} from "../service/api.ts";
export const store = configureStore({
    reducer: {
        auth:authReducer,
        [api.reducerPath]:api.reducer
    },
    middleware:(getDefault)=>getDefault().concat(api.middleware)
})

// 推导出 RootState / AppDispatch（全项目通用）
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
