import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { logout, getMe } from '../../store/slices/authSlice';
import { Link } from 'react-router-dom';

const ROLE_COLORS: Record<string, string> = {
  DEVELOPER: 'bg-blue-100 text-blue-700',
  DEVOPS_ENGINEER: 'bg-purple-100 text-purple-700',
  PLATFORM_ENGINEER: 'bg-green-100 text-green-700',
  SECURITY_ADMIN: 'bg-red-100 text-red-700',
  ORG_ADMIN: 'bg-yellow-100 text-yellow-700',
};

export default function DashboardPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((s) => s.auth);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    dispatch(getMe());
  }, []);

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Nav */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <span className="font-semibold text-gray-900">IDP Platform</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user.email}</span>
          <button
            onClick={handleLogout}
            className="text-sm px-4 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 transition-colors"
          >
            Sign out
          </button>
        </div>
      </nav>

      {/* Main */}
      <main className="max-w-5xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Welcome, {user.fullName} 👋</h1>
          <p className="text-gray-500 mt-1">Here's your platform overview</p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Profile</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">Full Name</span><p className="font-medium">{user.fullName}</p></div>
            <div><span className="text-gray-500">Email</span><p className="font-medium">{user.email}</p></div>
            <div><span className="text-gray-500">Status</span>
              <p className="font-medium"><span className="inline-block px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs">{user.status}</span></p>
            </div>
            <div><span className="text-gray-500">Member since</span>
              <p className="font-medium">{new Date(user.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Roles */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Assigned Roles</h2>
          <div className="flex flex-wrap gap-2">
            {user.roles.map((role) => (
              <span key={role} className={`px-3 py-1 rounded-full text-sm font-medium ${ROLE_COLORS[role] ?? 'bg-gray-100 text-gray-700'}`}>
                {role.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>

        {/* Permissions */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Permissions ({user.permissions.length})</h2>
          <div className="flex flex-wrap gap-2">
            {user.permissions.map((perm) => (
              <span key={perm} className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs font-mono">
                {perm}
              </span>
            ))}
          </div>
        </div>

        {/* Upcoming modules placeholder */}
        {/* Quick Navigation */}
        {/* Quick Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/catalog"
            className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:border-primary-300 hover:shadow-md transition-all group">
            <div className="text-3xl mb-3">📦</div>
            <h3 className="font-semibold text-gray-800 group-hover:text-primary-600">Service Catalog</h3>
            <p className="text-sm text-gray-500 mt-1">Browse and manage platform services</p>
            <p className="text-xs text-primary-600 mt-3 font-medium">Open →</p>
          </Link>

          <Link to="/templates"
            className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:border-primary-300 hover:shadow-md transition-all group">
            <div className="text-3xl mb-3">🏗️</div>
            <h3 className="font-semibold text-gray-800 group-hover:text-primary-600">Project Templates</h3>
            <p className="text-sm text-gray-500 mt-1">Generate Node.js, FastAPI, Go, Spring Boot projects</p>
            <p className="text-xs text-primary-600 mt-3 font-medium">Open →</p>
          </Link>

          <Link to="/monitoring"
            className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:border-primary-300 hover:shadow-md transition-all group">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="font-semibold text-gray-800 group-hover:text-primary-600">Monitoring</h3>
            <p className="text-sm text-gray-500 mt-1">Metrics, logs, Prometheus & Grafana</p>
            <p className="text-xs text-primary-600 mt-3 font-medium">Open →</p>
          </Link>
          
          <div className="bg-white rounded-2xl shadow-sm border border-dashed border-gray-200 p-6 opacity-60">
            <div className="text-3xl mb-3">🤖</div>
            <h3 className="font-semibold text-gray-800">AI Copilot</h3>
            <p className="text-sm text-gray-500 mt-1">AI-powered operational assistance</p>
            <span className="inline-block mt-3 text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500">Phase 11</span>
          </div>
        </div>
      </main>
    </div>
  );
}
