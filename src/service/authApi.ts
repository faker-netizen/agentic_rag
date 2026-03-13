import { api } from './api'
import { setAccessToken } from '../features/auth/authSlice'

type LoginReq = { username: string; password: string }
type LoginRes = {
    accessToken: string
    user: { id: string; username: string; roles: string[] }
}

export const authApi = api.injectEndpoints({
    endpoints: (build) => ({
        login: build.mutation<LoginRes, LoginReq>({
            query: (body) => ({
                url: '/api/auth/login',
                method: 'POST',
                body,
            }),
            async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
                const { data } = await queryFulfilled
                dispatch(setAccessToken(data.accessToken))
            },
        }),

        me: build.query<{ user: unknown }, void>({
            query: () => '/api/auth/me',
            providesTags: ['Me'],
        }),
    }),
})

export const { useLoginMutation, useMeQuery } = authApi
