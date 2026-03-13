import {
    type BaseQueryFn, createApi,
    type FetchArgs,
    fetchBaseQuery,
    type FetchBaseQueryError
} from "@reduxjs/toolkit/query/react";
import type {RootState} from "../app/store.ts";
import {logout} from "../features/auth/authSlice.ts";

const rawBaseQuery = fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_BASE_URL,
    prepareHeaders: (headers, {getState}) => {
        const token = (getState() as RootState).auth.accessToken
        if (token) headers.set('authorization', `Bearer ${token}`)
        return headers
    }
})
const baseQueryWith401: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> =
    async (args, api, extraOptions) => {
        const result = await rawBaseQuery(args, api, extraOptions)
        if (result.error?.status === 401) {
            api.dispatch(logout())
        }
        return result
    }

export const api = createApi({
    reducerPath: 'api',
    baseQuery: baseQueryWith401,
    tagTypes: ['Me'],
    endpoints: () => ({}),
})