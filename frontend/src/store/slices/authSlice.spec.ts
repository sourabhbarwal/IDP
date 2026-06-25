// Mock api-client to avoid Vite import.meta usage during tests
jest.mock('../../lib/api-client', () => ({
  apiClient: {
    post: jest.fn(() => Promise.resolve({ data: {} })),
    get: jest.fn(() => Promise.resolve({ data: {} })),
  },
}));

import authReducer, { clearError } from './authSlice';
import { login, logout, getMe } from './authSlice';

describe('authSlice reducer', () => {
  const initialState = authReducer(undefined, { type: '@@INIT' } as any);

  it('has correct initial state', () => {
    expect(initialState).toHaveProperty('user');
    expect(initialState).toHaveProperty('accessToken');
    expect(initialState).toHaveProperty('loading');
    expect(initialState).toHaveProperty('error');
  });

  it('clearError clears the error', () => {
    const stateWithError = { ...initialState, error: 'some error' } as any;
    const next = authReducer(stateWithError, clearError());
    expect(next.error).toBeNull();
  });

  it('handles login.fulfilled', () => {
    const payload = { user: { id: '1', email: 'a@b.com' }, accessToken: 'tok', refreshToken: 'r' } as any;
    const next = authReducer(initialState as any, { type: login.fulfilled.type, payload });
    expect(next.user).toEqual(payload.user);
    expect(next.accessToken).toBe(payload.accessToken);
  });

  it('handles login.pending and login.rejected', () => {
    const pending = authReducer(initialState as any, { type: login.pending.type });
    expect(pending.loading).toBe(true);
    const rejected = authReducer(pending as any, { type: login.rejected.type, payload: 'bad creds' });
    expect(rejected.loading).toBe(false);
    expect(rejected.error).toBe('bad creds');
  });

  it('handles logout.fulfilled', () => {
    const state = { ...initialState, user: { id: '1' }, accessToken: 'tok' } as any;
    const next = authReducer(state, { type: logout.fulfilled.type });
    expect(next.user).toBeNull();
    expect(next.accessToken).toBeNull();
  });

  it('handles getMe.fulfilled', () => {
    const payload = { id: '1', email: 'x@y.com' } as any;
    const next = authReducer(initialState as any, { type: getMe.fulfilled.type, payload });
    expect(next.user).toEqual(payload);
  });

  it('handles register pending/fulfilled/rejected', () => {
    const p = authReducer(initialState as any, { type: 'auth/register/pending' });
    expect(p.loading).toBe(true);
    const f = authReducer(p as any, { type: 'auth/register/fulfilled' });
    expect(f.loading).toBe(false);
    const r = authReducer(f as any, { type: 'auth/register/rejected', payload: 'reg failed' });
    expect(r.loading).toBe(false);
    expect(r.error).toBe('reg failed');
  });
});
