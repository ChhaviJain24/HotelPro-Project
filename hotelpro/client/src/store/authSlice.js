import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api, { msg } from '../api';

const saved = () => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } };
const thunk = (name, url) => createAsyncThunk('auth/' + name, async (body, { rejectWithValue }) => {
  try { return (await api.post(url, body)).data; } catch (e) { return rejectWithValue(msg(e)); }
});
export const login = thunk('login', '/auth/login');
export const register = thunk('register', '/auth/register');

const slice = createSlice({
  name: 'auth',
  initialState: { user: saved(), token: localStorage.getItem('token'), loading: false, error: null },
  reducers: {
    logout(s) { s.user = null; s.token = null; localStorage.removeItem('token'); localStorage.removeItem('user'); },
    setUser(s, a) { s.user = a.payload; localStorage.setItem('user', JSON.stringify(a.payload)); },
    clearError(s) { s.error = null; },
  },
  extraReducers: (b) => {
    for (const t of [login, register]) {
      b.addCase(t.pending, (s) => { s.loading = true; s.error = null; })
        .addCase(t.rejected, (s, a) => { s.loading = false; s.error = a.payload; })
        .addCase(t.fulfilled, (s, a) => {
          s.loading = false; s.user = a.payload.user; s.token = a.payload.token;
          localStorage.setItem('token', a.payload.token); localStorage.setItem('user', JSON.stringify(a.payload.user));
        });
    }
  },
});
export const { logout, setUser, clearError } = slice.actions;
export default slice.reducer;
