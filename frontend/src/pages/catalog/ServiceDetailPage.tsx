import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchServiceById, updateService, deleteService } from '../../store/slices/catalogSlice';
import { fetchRepositoryByServiceId, provisionRepository } from '../../store/slices/repositorySlice';
import { ServiceStatus } from '../../types/catalog.types';

const TYPE_COLORS: Record<string, string> = {
  NODEJS: 'bg-green-100 text-green-700', SPRING_BOOT: 'bg-blue-100 text-blue-700',
  FASTAPI: 'bg-yellow-100 text-yellow-700', GO: 'bg-cyan-100 text-cyan-700',
  OTHER: 'bg-gray-100 text-gray-700',
};

const REPO_STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  PROVISIONING: 'bg-blue-100 text-blue-700',
  FAILED: 'bg-red-100 text-red-700',
  ARCHIVED: 'bg-gray-100 text-gray-700',
};

export default function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const { selectedService: service, loading, error } = useAppSelector((s) => s.catalog);
  const { repositoriesByServiceId, loading: repoLoading, error: repoError } = useAppSelector((s) => s.repository);
  const { user } = useAppSelector((s) => s.auth);

  const [updatingStatus, setUpdatingStatus] = useState(false);

  const repository = service ? repositoriesByServiceId[service.id] : null;

  useEffect(() => {
    if (id) {
      dispatch(fetchServiceById(id));
    }
  }, [id, dispatch]);

  useEffect(() => {
    if (service?.id) {
      dispatch(fetchRepositoryByServiceId(service.id));
    }
  }, [service?.id, dispatch]);

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

  const handleProvisionRepo = async () => {
    if (!service) return;
    if (!window.confirm(`Provision a GitHub repository for "${service.name}"?`)) return;
    await dispatch(provisionRepository({
      serviceId: service.id,
      serviceName: service.name,
      serviceType: service.type,
      description: service.description ?? '',
      visibility: 'private',
    }));
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
      {/* Nav */}
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

          {canModify && (
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
              {user?.permissions.includes('service:delete') && (
                <button onClick={handleDelete}
                  className="px-4 py-1.5 text-sm border border-red-200 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  Delete
                </button>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Left - main content */}
          <div className="col-span-2 space-y-6">

            {/* Repository Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900">GitHub Repository</h2>
                {(!repository || repository.status === 'FAILED') && user?.permissions.includes('repository:provision') && (
                  <button
                    onClick={handleProvisionRepo}
                    disabled={repoLoading}
                    className="px-4 py-1.5 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    {repoLoading ? 'Provisioning...' : repository ? 'Retry Provisioning' : 'Provision Repository'}
                  </button>
                )}
              </div>

              {repoError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 mb-4">
                  <p className="text-red-700 text-sm">{repoError}</p>
                </div>
              )}

              {repoLoading && !repository && (
                <div className="text-center py-6">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                  </div>
                  <p className="text-gray-400 text-sm mt-4">Provisioning repository...</p>
                </div>
              )}

              {!repository && !repoLoading && (
                <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                  <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  <p className="text-gray-400 text-sm">No repository provisioned yet</p>
                  {!user?.permissions.includes('repository:provision') && (
                    <p className="text-gray-300 text-xs mt-1">Contact a Platform Engineer to provision one</p>
                  )}
                </div>
              )}

              {repository && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <a href={repository.htmlUrl} target="_blank" rel="noreferrer"
                        className="text-primary-600 hover:underline font-medium font-mono text-sm flex items-center gap-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                        {repository.fullName}
                      </a>
                      <p className="text-gray-400 text-xs mt-0.5">Branch: {repository.defaultBranch} · {repository.visibility}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${REPO_STATUS_COLORS[repository.status]}`}>
                      {repository.status}
                    </span>
                  </div>

                  {repository.status === 'FAILED' && repository.errorMessage && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                      <p className="text-red-700 text-sm font-medium">Provisioning failed</p>
                      <p className="text-red-600 text-xs mt-1">{repository.errorMessage}</p>
                    </div>
                  )}

                  {repository.status === 'ACTIVE' && (
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Clone (HTTPS)</p>
                        <code className="block text-xs bg-gray-50 border border-gray-200 rounded px-3 py-2 text-gray-700 font-mono">
                          git clone {repository.cloneUrl}
                        </code>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Clone (SSH)</p>
                        <code className="block text-xs bg-gray-50 border border-gray-200 rounded px-3 py-2 text-gray-700 font-mono">
                          git clone {repository.sshUrl}
                        </code>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-gray-400">
                    Provisioned {new Date(repository.provisionedAt).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>

            {/* Service Details */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Details</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-gray-500">Owner</p><p className="font-medium">{service.ownerEmail}</p></div>
                <div><p className="text-gray-500">Team</p><p className="font-medium">{service.team ?? '—'}</p></div>
                <div><p className="text-gray-500">Created</p><p className="font-medium">{new Date(service.createdAt).toLocaleDateString()}</p></div>
                <div><p className="text-gray-500">Last Updated</p><p className="font-medium">{new Date(service.updatedAt).toLocaleDateString()}</p></div>
                {service.repositoryUrl && (
                  <div className="col-span-2">
                    <p className="text-gray-500">External Repository</p>
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

          {/* Right Sidebar */}
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
                </div>
              )}
            </div>

            {repository?.status === 'ACTIVE' && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-4">Quick Links</h2>
                <div className="space-y-2">
                  <a href={`${repository.htmlUrl}/actions`} target="_blank" rel="noreferrer"
                    className="block text-sm text-primary-600 hover:underline">→ CI/CD Pipelines</a>
                  <a href={`${repository.htmlUrl}/issues`} target="_blank" rel="noreferrer"
                    className="block text-sm text-primary-600 hover:underline">→ Issues</a>
                  <a href={`${repository.htmlUrl}/pulls`} target="_blank" rel="noreferrer"
                    className="block text-sm text-primary-600 hover:underline">→ Pull Requests</a>
                  <a href={`${repository.htmlUrl}/blob/main/README.md`} target="_blank" rel="noreferrer"
                    className="block text-sm text-primary-600 hover:underline">→ README</a>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}