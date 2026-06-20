import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchServiceById, updateService, deleteService } from '../../store/slices/catalogSlice';
import { ServiceStatus } from '../../types/catalog.types';

const TYPE_COLORS: Record<string, string> = {
  NODEJS: 'bg-green-100 text-green-700', SPRING_BOOT: 'bg-blue-100 text-blue-700',
  FASTAPI: 'bg-yellow-100 text-yellow-700', GO: 'bg-cyan-100 text-cyan-700', OTHER: 'bg-gray-100 text-gray-700',
};

export default function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { selectedService: service, loading, error } = useAppSelector((s) => s.catalog);
  const { user } = useAppSelector((s) => s.auth);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (id) dispatch(fetchServiceById(id));
  }, [id, dispatch]);

  const canModify = service && (
    service.ownerId === user?.id ||
    user?.roles.some((r) => ['ORG_ADMIN', 'PLATFORM_ENGINEER'].includes(r))
  );

  const handleStatusChange = async (status: ServiceStatus) => {
    if (!service) return;
    setUpdatingStatus(true);
    await dispatch(updateService({ id: service.id, payload: { status } }));
    setUpdatingStatus(false);
  };

  const handleDelete = async () => {
    if (!service || !window.confirm(`Delete "${service.name}"?`)) return;
    await dispatch(deleteService(service.id));
    navigate('/catalog');
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400">Loading...</p>
    </div>
  );

  if (error || !service) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-500 mb-4">{error ?? 'Service not found'}</p>
        <Link to="/catalog" className="text-primary-600 hover:underline">← Back to catalog</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link to="/catalog" className="text-gray-500 hover:text-gray-800 text-sm">← Service Catalog</Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 font-medium text-sm font-mono">{service.name}</span>
      </nav>

      <main className="max-w-5xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900 font-mono">{service.name}</h1>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[service.type] ?? 'bg-gray-100 text-gray-700'}`}>
                {service.type.replace('_', ' ')}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                service.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
                service.status === 'DEPRECATED' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
              }`}>{service.status}</span>
            </div>
            {service.description && <p className="text-gray-500">{service.description}</p>}
          </div>

          {canModify && user?.permissions.includes('service:delete') && (
            <div className="flex gap-2">
              <select
                value={service.status}
                onChange={(e) => handleStatusChange(e.target.value as ServiceStatus)}
                disabled={updatingStatus}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="ACTIVE">Active</option>
                <option value="DEPRECATED">Deprecated</option>
                <option value="ARCHIVED">Archived</option>
              </select>
              <button onClick={handleDelete}
                className="px-4 py-1.5 text-sm border border-red-200 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                Delete
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Metadata */}
          <div className="col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Details</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-gray-500">Owner</p><p className="font-medium">{service.ownerEmail}</p></div>
                <div><p className="text-gray-500">Team</p><p className="font-medium">{service.team ?? '—'}</p></div>
                <div><p className="text-gray-500">Created</p><p className="font-medium">{new Date(service.createdAt).toLocaleDateString()}</p></div>
                <div><p className="text-gray-500">Last Updated</p><p className="font-medium">{new Date(service.updatedAt).toLocaleDateString()}</p></div>
                {service.repositoryUrl && (
                  <div className="col-span-2">
                    <p className="text-gray-500">Repository</p>
                    <a href={service.repositoryUrl} target="_blank" rel="noreferrer"
                      className="text-primary-600 hover:underline font-medium truncate block">{service.repositoryUrl}</a>
                  </div>
                )}
              </div>
            </div>

            {/* Version History */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Deployment History</h2>
              {service.versions.length === 0 ? (
                <p className="text-gray-400 text-sm">No deployments recorded yet</p>
              ) : (
                <div className="space-y-3">
                  {service.versions.map((v) => (
                    <div key={v.id} className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-mono rounded">{v.version}</span>
                      <div className="flex-1">
                        {v.changelog && <p className="text-sm text-gray-700">{v.changelog}</p>}
                        <p className="text-xs text-gray-400 mt-0.5">
                          {v.environment && <span className="mr-2">{v.environment}</span>}
                          {v.deployedAt ? new Date(v.deployedAt).toLocaleDateString() : new Date(v.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Tags</h2>
              {service.tags.length === 0 ? (
                <p className="text-gray-400 text-sm">No tags</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {service.tags.map((tag) => (
                    <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-mono rounded">{tag}</span>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Latest Version</h2>
              {service.versions.length === 0 ? (
                <p className="text-gray-400 text-sm">Not deployed yet</p>
              ) : (
                <div>
                  <p className="text-2xl font-bold text-gray-900 font-mono">
                    {[...service.versions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]?.version}
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    {[...service.versions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]?.environment ?? ''}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}