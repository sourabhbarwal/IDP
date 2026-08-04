import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { register as registerUser, clearError } from '../../store/slices/authSlice';

const schema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error } = useAppSelector((s) => s.auth);
  const [success, setSuccess] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => () => { dispatch(clearError()); }, [dispatch]);

  const onSubmit = async (data: FormData) => {
    const result = await dispatch(registerUser({
      email: data.email,
      password: data.password,
      fullName: data.fullName,
    }));
    if (registerUser.fulfilled.match(result)) {
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary-600 mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-500 mt-1 text-sm">Join IDP Platform</p>
        </div>

        {success && (
          <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200">
            <p className="text-green-700 text-sm">Account created! Redirecting to login…</p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {[
            { name: 'fullName' as const, label: 'Full Name', type: 'text', placeholder: 'Jane Doe' },
            { name: 'email' as const, label: 'Email', type: 'email', placeholder: 'you@example.com' },
            { name: 'password' as const, label: 'Password', type: 'password', placeholder: '••••••••' },
            { name: 'confirmPassword' as const, label: 'Confirm Password', type: 'password', placeholder: '••••••••' },
          ].map(({ name, label, type, placeholder }) => (
            <div key={name}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input
                {...register(name)}
                type={type}
                placeholder={placeholder}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {errors[name] && <p className="text-red-600 text-xs mt-1">{errors[name]?.message}</p>}
            </div>
          ))}

          <button
            type="submit"
            disabled={loading || success}
            className="w-full py-2.5 px-4 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors mt-2"
          >
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-600 font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
