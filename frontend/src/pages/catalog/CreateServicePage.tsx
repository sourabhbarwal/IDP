import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { createService, clearError } from '../../store/slices/catalogSlice';
import { ServiceType } from '../../types/catalog.types';
import { useRealtime } from '../../context/RealtimeContext';
import { NotificationCenter } from '../../components/notifications/NotificationCenter';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  type: z.enum(['SPRING_BOOT', 'NODEJS', 'FASTAPI', 'GO', 'OTHER'] as const),
  description: z.string().max(1000).optional(),
  team: z.string().max(100).optional(),
  repositoryUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  tagsRaw: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function CreateServicePage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error } = useAppSelector((s) => s.catalog);
  const { connected, notifications, unreadCount, markAllRead, markRead } = useRealtime();
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'NODEJS' },
  });

  useEffect(() => () => { dispatch(clearError()); }, [dispatch]);

  const onSubmit = async (data: FormData) => {
    const tags = data.tagsRaw ? data.tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : [];
    const result = await dispatch(createService({
      name: data.name,
      type: data.type as ServiceType,
      description: data.description || undefined,
      team: data.team || undefined,
      repositoryUrl: data.repositoryUrl || undefined,
      tags,
    }));
    if (createService.fulfilled.match(result)) {
      navigate(`/catalog/${result.payload.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link to="/catalog" className="text-gray-500 hover:text-gray-800 text-sm">← Service Catalog</Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 font-medium text-sm">New Service</span>
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

      <main className="max-w-2xl mx-auto p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Register New Service</h1>
        <p className="text-gray-500 text-sm mb-8">Add a service to the IDP catalog</p>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-200">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service Name *</label>
              <input {...register('name')} placeholder="my-awesome-service"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              <p className="text-gray-400 text-xs mt-1">Spaces will be converted to hyphens and lowercased</p>
              {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
              <select {...register('type')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                {(['NODEJS', 'SPRING_BOOT', 'FASTAPI', 'GO', 'OTHER'] as const).map((t) => (
                  <option key={t} value={t}>{t.replace('_', ' ')}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea {...register('description')} rows={3} placeholder="What does this service do?"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
              {errors.description && <p className="text-red-600 text-xs mt-1">{errors.description.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Team</label>
                <input {...register('team')} placeholder="platform-team"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Repository URL</label>
                <input {...register('repositoryUrl')} placeholder="https://github.com/org/repo"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                {errors.repositoryUrl && <p className="text-red-600 text-xs mt-1">{errors.repositoryUrl.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
              <input {...register('tagsRaw')} placeholder="api, nodejs, payments (comma separated)"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={loading}
                className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors">
                {loading ? 'Creating...' : 'Create Service'}
              </button>
              <Link to="/catalog" className="px-6 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}