import axios, {type AxiosInstance, type AxiosRequestConfig} from "axios";
import {attachRequestInterceptor, attachResponseInterceptor} from "@/service/httpClientInterceptors.ts";
import {unwrap} from "@/service/httpClientUtils.ts";
import {apiBaseUrl} from "@/service/apiBase.ts";

export {RequestError, type ApiErrorResponse} from "@/service/httpClientUtils.ts";

function createHttpClient(): AxiosInstance {
    const instance = axios.create({
        baseURL: apiBaseUrl(),
        timeout: 15000,
        withCredentials: true,
        headers: {"Content-Type": "application/json"},
    });
    attachRequestInterceptor(instance);
    attachResponseInterceptor(instance);
    return instance;
}

const instance = createHttpClient();

export const http = {
    async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
        const res = await instance.get(url, config);
        return unwrap<T>(res);
    },

    async post<T, B = unknown>(url: string, data?: B, config?: AxiosRequestConfig): Promise<T> {
        const res = await instance.post(url, data, config);
        return unwrap<T>(res);
    },

    async put<T, B = unknown>(url: string, data?: B, config?: AxiosRequestConfig): Promise<T> {
        const res = await instance.put(url, data, config);
        return unwrap<T>(res);
    },

    async patch<T, B = unknown>(url: string, data?: B, config?: AxiosRequestConfig): Promise<T> {
        const res = await instance.patch(url, data, config);
        return unwrap<T>(res);
    },

    async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
        const res = await instance.delete(url, config);
        return unwrap<T>(res);
    },
};

export default http;
