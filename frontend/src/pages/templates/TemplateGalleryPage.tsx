import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../../hooks/redux';
import { templateService, GenerateTemplateParams } from '../../services/template.service';
import { TemplateMetadata, TemplateType } from '../../types/template.types';
import { useRealtime } from '../../context/RealtimeContext';
import { NotificationCenter } from '../../components/notifications/NotificationCenter';

const LANG_ICONS: Record<string, string> = {
  TypeScript: '🟦',
  Python: '🐍',
  Go: '🐹',
  Java: '☕',
};

const LANG_COLORS: Record<string, string> = {
  TypeScript: 'border-blue-200 bg-blue-50',
  Python: 'border-yellow-200 bg-yellow-50',
  Go: 'border-cyan-200 bg-cyan-50',
  Java: 'border-orange-200 bg-orange-50',
};

interface GenerateModalState {
  template: TemplateMetadata;
  params: GenerateTemplateParams;
}

export default function TemplateGalleryPage() {
  const { user } = useAppSelector((s) => s.auth);
  const [templates, setTemplates] = useState<TemplateMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<GenerateModalState | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const { connected, notifications, unreadCount, markAllRead, markRead } = useRealtime();
  useEffect(() => {
    templateService.listAll()
      .then((res) => setTemplates(res.data))
      .catch(() => setError('Failed to load templates'))
      .finally(() => setLoading(false));
  }, []);

  const openModal = (template: TemplateMetadata) => {
    setDownloadError(null);
    setModal({
      template,
      params: {
        serviceName: '',
        description: '',
        port: 3000,
        packageName: template.type === 'SPRING_BOOT' ? 'com.example' : '',
      },
    });
  };

  const handleDownload = async () => {
    if (!modal || !modal.params.serviceName.trim()) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      await templateService.download(modal.template.type as TemplateType, {
        ...modal.params,
        author: user?.fullName,
        authorEmail: user?.email,
      });
      setModal(null);
    } catch (err: unknown) {
      setDownloadError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          </div>
          <span className="font-semibold text-gray-900">IDP Platform</span>
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-600 font-medium">Project Templates</span>
        <div className="ml-auto">
          <NotificationCenter
            connected={connected}
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkAllRead={markAllRead}
            onMarkRead={markRead}
          />
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Project Templates</h1>
          <p className="text-gray-500 mt-1">
            Generate a production-ready project scaffold. Each template includes health endpoints,
            Prometheus metrics, structured logging, security config, Dockerfile, GitHub Actions CI and Kubernetes manifests.
          </p>
        </div>

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-3"></div>
                <div className="h-4 bg-gray-100 rounded w-2/3 mb-6"></div>
                <div className="space-y-2">
                  {[1, 2, 3].map((j) => <div key={j} className="h-3 bg-gray-100 rounded"></div>)}
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {templates.map((tmpl) => (
              <div key={tmpl.type}
                className={`bg-white rounded-2xl border-2 ${LANG_COLORS[tmpl.language] ?? 'border-gray-200 bg-gray-50'} p-6 flex flex-col`}>
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">{LANG_ICONS[tmpl.language] ?? '📦'}</span>
                      <h2 className="text-lg font-bold text-gray-900">{tmpl.name}</h2>
                    </div>
                    <div className="flex gap-2 text-xs text-gray-500">
                      <span className="px-2 py-0.5 bg-white rounded border border-gray-200">{tmpl.language}</span>
                      <span className="px-2 py-0.5 bg-white rounded border border-gray-200">{tmpl.framework}</span>
                      <span className="px-2 py-0.5 bg-white rounded border border-gray-200">v{tmpl.version}</span>
                    </div>
                  </div>
                </div>

                <p className="text-gray-600 text-sm mb-4 flex-1">{tmpl.description}</p>

                {/* Features */}
                <div className="mb-5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Included</p>
                  <div className="flex flex-wrap gap-1.5">
                    {tmpl.features.map((f) => (
                      <span key={f}
                        className="px-2 py-0.5 bg-white border border-gray-200 text-gray-600 text-xs rounded-full">
                        ✓ {f}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Action */}
                <button
                  onClick={() => openModal(tmpl)}
                  className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Generate & Download
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Generate Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">
                  Generate {modal.template.name} Project
                </h3>
                <button onClick={() => setModal(null)}
                  className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-gray-500 text-sm mt-1">
                A zip file will be downloaded to your computer.
              </p>
            </div>

            <div className="p-6 space-y-4">
              {downloadError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-red-700 text-sm">{downloadError}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="my-awesome-service"
                  value={modal.params.serviceName}
                  onChange={(e) => setModal({ ...modal, params: { ...modal.params, serviceName: e.target.value } })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-gray-400 text-xs mt-1">Will become the project folder and package name</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="What does this service do?"
                  value={modal.params.description}
                  onChange={(e) => setModal({ ...modal, params: { ...modal.params, description: e.target.value } })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                <input
                  type="number"
                  min={1024} max={65535}
                  value={modal.params.port}
                  onChange={(e) => setModal({ ...modal, params: { ...modal.params, port: Number(e.target.value) } })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {modal.template.type === 'SPRING_BOOT' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Java Package Name</label>
                  <input
                    type="text"
                    placeholder="com.myorg"
                    value={modal.params.packageName}
                    onChange={(e) => setModal({ ...modal, params: { ...modal.params, packageName: e.target.value } })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              )}

              {modal.template.type === 'GO' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Go Module Path</label>
                  <input
                    type="text"
                    placeholder="github.com/your-org/my-service"
                    value={modal.params.packageName}
                    onChange={(e) => setModal({ ...modal, params: { ...modal.params, packageName: e.target.value } })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              )}

              {/* Files preview */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-gray-500 mb-2">Files that will be generated ({modal.template.includedFiles.length})</p>
                <div className="max-h-24 overflow-y-auto space-y-1">
                  {modal.template.includedFiles.map((f) => (
                    <p key={f} className="text-xs text-gray-600 font-mono">{f}</p>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={handleDownload}
                disabled={downloading || !modal.params.serviceName.trim()}
                className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
              >
                {downloading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Zip
                  </>
                )}
              </button>
              <button onClick={() => setModal(null)}
                className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}   