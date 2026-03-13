import {createSlice, type PayloadAction} from "@reduxjs/toolkit";

type AuthState = {
    accessToken: string | null
}
const initialState: AuthState = {
    accessToken: localStorage.getItem("accessToken")
}
const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setAccessToken(state, action: PayloadAction<string | null>) {
            state.accessToken = action.payload
            if (action.payload) localStorage.setItem('accessToken', action.payload)
            else localStorage.removeItem('accessToken')
        },
        logout(state) {
            state.accessToken = null
            localStorage.removeItem('accessToken')
        }
    }
})

export const {setAccessToken, logout} = authSlice.actions
export default authSlice.reducer