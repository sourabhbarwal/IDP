import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchServices, deleteService } from '../../store/slices/catalogSlice';
import { ServiceType } from '../../types/catalog.types';
import { useRealtime } from '../../context/RealtimeContext';
import { NotificationCenter } from '../../components/notifications/NotificationCenter';

const TYPE_COLORS: Record<string, string> = {
  NODEJS: 'bg-green-100 text-green-700',
  SPRING_BOOT: 'bg-blue-100 text-blue-700',
  FASTAPI: 'bg-yellow-100 text-yellow-700',
  GO: 'bg-cyan-100 text-cyan-700',
  OTHER: 'bg-gray-100 text-gray-700',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  DEPRECATED: 'bg-orange-100 text-orange-700',
  ARCHIVED: 'bg-red-100 text-red-700',
};

export default function ServiceListPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { services, totalElements, totalPages, loading, error } = useAppSelector((s) => s.catalog);
  const { user } = useAppSelector((s) => s.auth);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(0);
  const { connected, notifications, unreadCount, markAllRead, markRead } = useRealtime();

  useEffect(() => {
    dispatch(fetchServices({ search: search || undefined, type: typeFilter as ServiceType || undefined, page, size: 20 }));
  }, [search, typeFilter, page, dispatch]);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete service "${name}"? This cannot be undone.`)) return;
    await dispatch(deleteService(id));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <span className="font-semibold text-gray-900">IDP Platform</span>
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-gray-600 font-medium">Service Catalog</span>
        </div>
        <div className="flex items-center gap-3">
          <NotificationCenter
            connected={connected}
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkAllRead={markAllRead}
            onMarkRead={markRead}
          />
          <span className="text-sm text-gray-500">{user?.email}</span>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Service Catalog</h1>
            <p className="text-gray-500 mt-1 text-sm">{totalElements} services registered</p>
          </div>
          {user?.permissions.includes('service:create') && (
            <Link
              to="/catalog/new"
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <span>+</span> New Service
            </Link>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex gap-4">
          <input
            type="text"
            placeholder="Search services..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Types</option>
            {['NODEJS', 'SPRING_BOOT', 'FASTAPI', 'GO', 'OTHER'].map((t) => (
              <option key={t} value={t}>{t.replace('_', ' ')}</option>
            ))}
          </select>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400">Loading...</div>
          ) : services.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-400 text-lg mb-4">No services found</p>
              {user?.permissions.includes('service:create') && (
                <Link to="/catalog/new" className="text-primary-600 font-medium hover:underline">Create your first service →</Link>
              )}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Name', 'Type', 'Status', 'Owner', 'Team', 'Tags', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {services.map((svc) => (
                  <tr key={svc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link to={`/catalog/${svc.id}`} className="font-medium text-gray-900 hover:text-primary-600">
                        {svc.name}
                      </Link>
                      {svc.description && <p className="text-gray-400 text-xs mt-0.5 truncate max-w-xs">{svc.description}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[svc.type] ?? 'bg-gray-100 text-gray-700'}`}>
                        {svc.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[svc.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {svc.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{svc.ownerEmail}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{svc.team ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {svc.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-mono">{tag}</span>
                        ))}
                        {svc.tags.length > 3 && <span className="text-gray-400 text-xs">+{svc.tags.length - 3}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button onClick={() => navigate(`/catalog/${svc.id}`)} className="text-gray-400 hover:text-primary-600 text-xs">View</button>
                        {user?.permissions.includes('service:delete') && (
                          <button onClick={() => handleDelete(svc.id, svc.name)} className="text-gray-400 hover:text-red-600 text-xs">Delete</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
            <span>Page {page + 1} of {totalPages}</span>
            <div className="flex gap-2">
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">
                Previous
              </button>
              <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">
                Next
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}