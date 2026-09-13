import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';

const BASE = `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001'}/api/v1`;

export default function RegisterPage() {
  const navigate  = useNavigate();
  const [form, setForm] = useState({
    firstName: '',
    lastName:  '',
    email:     '',
    password:  '',
    confirm:   '',
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const set = (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((p) => ({ ...p, [field]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      setError('All fields are required.');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post(`${BASE}/auth/register`, {
        email:     form.email,
        password:  form.password,
        firstName: form.firstName,
        lastName:  form.lastName,
      });
      // Registration always assigns DEVELOPER role
      navigate('/login', {
        state: { message: 'Account created! You have been assigned the Developer role. Log in to continue.' },
      });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail ?? 'Registration failed. Email may already be in use.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100
                    flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary-600 flex items-center justify-center
                          mx-auto mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5
                   a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create account</h1>
          <p className="text-gray-500 text-sm mt-1">Join the IDP Platform</p>
        </div>

        {/* Role notice */}
        <div className="mb-5 p-3 bg-blue-50 border border-blue-200 rounded-xl
                        flex items-start gap-2">
          <span className="text-blue-500 mt-0.5">ℹ️</span>
          <div>
            <p className="text-sm text-blue-800 font-medium">Developer role assigned by default</p>
            <p className="text-xs text-blue-600 mt-0.5">
              Self-registered accounts receive the Developer role. Contact a platform admin
              to be promoted to Operator or Admin.
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <form onSubmit={submit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">First name</label>
                <input
                  value={form.firstName}
                  onChange={set('firstName')}
                  placeholder="Sourabh"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm
                             focus:outline-none focus:ring-2 focus:ring-primary-500
                             focus:border-transparent transition-shadow"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Last name</label>
                <input
                  value={form.lastName}
                  onChange={set('lastName')}
                  placeholder="Barwal"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm
                             focus:outline-none focus:ring-2 focus:ring-primary-500
                             focus:border-transparent transition-shadow"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Email address</label>
              <input
                type="email"
                value={form.email}
                onChange={set('email')}
                placeholder="you@company.com"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm
                           focus:outline-none focus:ring-2 focus:ring-primary-500
                           focus:border-transparent transition-shadow"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={set('password')}
                placeholder="Min 8 characters"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm
                           focus:outline-none focus:ring-2 focus:ring-primary-500
                           focus:border-transparent transition-shadow"
              />
            </div>

            {/* Confirm */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Confirm password</label>
              <input
                type="password"
                value={form.confirm}
                onChange={set('confirm')}
                placeholder="Repeat your password"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm
                           focus:outline-none focus:ring-2 focus:ring-primary-500
                           focus:border-transparent transition-shadow"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white
                         font-semibold rounded-xl transition-colors disabled:opacity-50
                         disabled:cursor-not-allowed shadow-sm mt-2"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
              Sign in
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          IDP Platform · Internal Developer Portal
        </p>
      </div>
    </div>
  );
}