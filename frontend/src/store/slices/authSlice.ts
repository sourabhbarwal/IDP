import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { apiClient } from '../../lib/api-client';
import { AuthTokens, User } from '../../types/auth.types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null,
  accessToken: localStorage.getItem('accessToken'),
  loading: false,
  error: null,
};

// ── Thunks ───────────────────────────────────────────────────────────────────
export const register = createAsyncThunk(
  'auth/register',
  async (payload: { email: string; password: string; fullName: string }, { rejectWithValue }) => {
    try {
      const { data } = await apiClient.post<User>('/auth/register', payload);
      return data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail ?? 'Registration failed');
    }
  },
);

export const login = createAsyncThunk(
  'auth/login',
  async (payload: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const { data } = await apiClient.post<AuthTokens>('/auth/login', payload);
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      return data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail ?? 'Invalid credentials');
    }
  },
);

export const logout = createAsyncThunk('auth/logout', async () => {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      await apiClient.post('/auth/logout', { refreshToken });
    }
  } catch {
    // Always clear local state even if server call fails
  } finally {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }
});

export const getMe = createAsyncThunk('auth/getMe', async (_, { rejectWithValue }) => {
  try {
    const { data } = await apiClient.get<User>('/users/me');
    localStorage.setItem('user', JSON.stringify(data));
    return data;
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.detail ?? 'Failed to fetch user');
  }
});

// ── Slice ────────────────────────────────────────────────────────────────────
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Register
    builder.addCase(register.pending, (state) => { state.loading = true; state.error = null; });
    builder.addCase(register.fulfilled, (state) => { state.loading = false; });
    builder.addCase(register.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Login
    builder.addCase(login.pending, (state) => { state.loading = true; state.error = null; });
    builder.addCase(login.fulfilled, (state, action) => {
      state.loading = false;
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
    });
    builder.addCase(login.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Logout
    builder.addCase(logout.fulfilled, (state) => {
      state.user = null;
      state.accessToken = null;
    });

    // GetMe
    builder.addCase(getMe.fulfilled, (state, action) => { state.user = action.payload; });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
