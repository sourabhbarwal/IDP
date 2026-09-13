import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../../hooks/redux';
import {
  usersService,
  PlatformUser,
  UserRole,
  UserStatus,
  CreateUserPayload,
  ROLE_CONFIG,
  STATUS_CONFIG,
} from '../../services/users.service';

const ALL_ROLES: UserRole[] = ['ADMIN', 'DEVELOPER', 'OPERATOR', 'VIEWER', 'SERVICE_ACCOUNT'];

// ── Create User Modal ─────────────────────────────────────────────────────────

function CreateUserModal({
  onClose,
  onCreated,
}: {
  onClose:   () => void;
  onCreated: (user: PlatformUser) => void;
}) {
  const [form, setForm] = useState<CreateUserPayload>({
    email:     '',
    password:  '',
    firstName: '',
    lastName:  '',
    roles:     ['DEVELOPER'],
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const toggleRole = (role: UserRole) => {
    setForm((prev) => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role],
    }));
  };

  const submit = async () => {
    if (!form.email || !form.password || !form.firstName || !form.lastName) {
      setError('All fields are required.');
      return;
    }
    if (form.roles.length === 0) {
      setError('Select at least one role.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data } = await usersService.create(form);
      onCreated(data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail ?? 'Failed to create user';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Create New User</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            User receives an email with their temporary password.
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">First name</label>
              <input
                value={form.firstName}
                onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="John"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Last name</label>
              <input
                value={form.lastName}
                onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Doe"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email address</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="john.doe@company.com"
            />
          </div>

          {/* Temporary password */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Temporary password
              <span className="text-gray-400 font-normal ml-1">(min 8 characters)</span>
            </label>
            <input
              type="text"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="TempPass123!"
            />
            <p className="text-xs text-gray-400 mt-1">
              Share this with the user. They should change it after first login.
            </p>
          </div>

          {/* Roles */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Assign roles</label>
            <div className="space-y-2">
              {ALL_ROLES.map((role) => {
                const cfg     = ROLE_CONFIG[role];
                const checked = form.roles.includes(role);
                return (
                  <label
                    key={role}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer
                                transition-all ${
                      checked
                        ? 'border-primary-300 bg-primary-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleRole(role)}
                      className="mt-0.5 accent-primary-600"
                    />
                    <div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.color}`}>
                        {cfg.label}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">{cfg.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-xl
                       hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className="flex-1 px-4 py-2 text-sm bg-primary-600 text-white rounded-xl
                       hover:bg-primary-700 disabled:opacity-50 transition-colors font-medium"
          >
            {loading ? 'Creating...' : 'Create User'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Edit Roles Modal ──────────────────────────────────────────────────────────

function EditRolesModal({
  user,
  onClose,
  onUpdated,
}: {
  user:      PlatformUser;
  onClose:   () => void;
  onUpdated: (updated: PlatformUser) => void;
}) {
  const [selected, setSelected] = useState<UserRole[]>(user.roles as UserRole[]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const toggle = (role: UserRole) => {
    setSelected((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  };

  const save = async () => {
    if (selected.length === 0) { setError('Select at least one role.'); return; }
    setLoading(true); setError(null);
    try {
      const { data } = await usersService.updateRoles(user.id, selected);
      onUpdated(data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail ?? 'Failed to update roles';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Edit Roles</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
          </div>
          <p className="text-sm text-gray-500 mt-1">{user.email}</p>
        </div>

        <div className="px-6 py-4 space-y-2">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-3">
              {error}
            </div>
          )}
          {ALL_ROLES.map((role) => {
            const cfg     = ROLE_CONFIG[role];
            const checked = selected.includes(role);
            return (
              <label
                key={role}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer
                            transition-all ${
                  checked
                    ? 'border-primary-300 bg-primary-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(role)}
                  className="accent-primary-600"
                />
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.color}`}>
                  {cfg.label}
                </span>
                <span className="text-xs text-gray-500 flex-1">{cfg.description}</span>
              </label>
            );
          })}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
          <button
            onClick={save}
            disabled={loading}
            className="flex-1 px-4 py-2 text-sm bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 font-medium"
          >
            {loading ? 'Saving...' : 'Save Roles'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function UserManagementPage() {
  const { user: currentUser } = useAppSelector((s) => s.auth);

  const [users,        setUsers]        = useState<PlatformUser[]>([]);
  const [total,        setTotal]        = useState(0);
  const [page,         setPage]         = useState(0);
  const [search,       setSearch]       = useState('');
  const [roleFilter,   setRoleFilter]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading,      setLoading]      = useState(true);
  const [showCreate,   setShowCreate]   = useState(false);
  const [editingUser,  setEditingUser]  = useState<PlatformUser | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isAdmin = currentUser?.roles?.includes('ADMIN') ?? false;

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await usersService.list({
        page,
        size:   20,
        search: search || undefined,
        role:   roleFilter  || undefined,
        status: statusFilter || undefined,
      });
      setUsers(data.content);
      setTotal(data.totalElements);
    } catch {
      // show empty state
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, statusFilter]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleStatusToggle = async (user: PlatformUser) => {
    const newStatus: UserStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setActionLoading(user.id);
    try {
      const { data } = await usersService.updateStatus(user.id, newStatus);
      setUsers((prev) => prev.map((u) => (u.id === data.id ? data : u)));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (user: PlatformUser) => {
    if (!window.confirm(`Delete ${user.email}? This cannot be undone.`)) return;
    setActionLoading(user.id);
    try {
      await usersService.delete(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      setTotal((t) => t - 1);
    } finally {
      setActionLoading(null);
    }
  };

  // If not admin — show access denied
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-500 text-sm">User management requires the ADMIN role.</p>
          <Link to="/dashboard" className="mt-4 inline-block text-primary-600 text-sm hover:underline">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <span className="font-semibold text-gray-900">IDP Platform</span>
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-600 font-medium">User Management</span>

        <div className="ml-auto">
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white
                       text-sm font-medium rounded-xl hover:bg-primary-700 transition-colors"
          >
            <span>+</span> Create User
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 text-sm mt-1">
            {total} user{total !== 1 ? 's' : ''} on the platform · ADMIN access only
          </p>
        </div>

        {/* Role reference card */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Role Reference</p>
          <div className="flex flex-wrap gap-3">
            {ALL_ROLES.map((role) => {
              const cfg = ROLE_CONFIG[role];
              return (
                <div key={role} className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.color}`}>
                    {cfg.label}
                  </span>
                  <span className="text-xs text-gray-500 hidden md:inline">{cfg.description}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-5">
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search by name or email..."
            className="flex-1 min-w-48 px-4 py-2 border border-gray-200 rounded-xl text-sm
                       focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(0); }}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm
                       focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="">All roles</option>
            {ALL_ROLES.map((r) => (
              <option key={r} value={r}>{ROLE_CONFIG[r].label}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm
                       focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>

        {/* Users table */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent
                              rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-4xl mb-3">👤</div>
              <p className="text-gray-500 text-sm">No users found matching your filters.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Roles
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Created
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Last login
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isSelf    = user.email === currentUser?.email;
                  const isSeed    = user.email === 'dev@example.com';
                  const statusCfg = STATUS_CONFIG[user.status];
                  const isLoading = actionLoading === user.id;

                  return (
                    <tr key={user.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors
                      ${isSelf ? 'bg-primary-50/30' : ''}`}>

                      {/* User info */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400
                                          to-primary-600 flex items-center justify-center text-white
                                          text-xs font-bold shrink-0">
                            {user.firstName[0]}{user.lastName[0]}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {user.firstName} {user.lastName}
                              {isSelf && (
                                <span className="ml-2 text-xs text-primary-600 font-normal">(you)</span>
                              )}
                              {isSeed && (
                                <span className="ml-2 text-xs text-amber-600 font-normal">🔐 seed</span>
                              )}
                            </p>
                            <p className="text-xs text-gray-400">{user.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Roles */}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(user.roles as UserRole[]).map((role) => (
                            <span
                              key={role}
                              className={`text-xs font-medium px-2 py-0.5 rounded-full border
                                          ${ROLE_CONFIG[role]?.color ?? 'bg-gray-100 text-gray-600'}`}
                            >
                              {ROLE_CONFIG[role]?.label ?? role}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                      </td>

                      {/* Created */}
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>

                      {/* Last login */}
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {user.lastLoginAt
                          ? new Date(user.lastLoginAt).toLocaleDateString()
                          : '—'}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          {/* Edit roles */}
                          <button
                            onClick={() => setEditingUser(user)}
                            disabled={isSelf || isLoading}
                            className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg
                                       hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed
                                       transition-colors"
                            title={isSelf ? 'Cannot edit your own roles' : 'Edit roles'}
                          >
                            Edit roles
                          </button>

                          {/* Activate / Deactivate toggle */}
                          <button
                            onClick={() => handleStatusToggle(user)}
                            disabled={isSelf || isSeed || isLoading}
                            className={`px-3 py-1.5 text-xs rounded-lg border transition-colors
                                        disabled:opacity-40 disabled:cursor-not-allowed
                                        ${user.status === 'ACTIVE'
                              ? 'border-yellow-200 text-yellow-700 hover:bg-yellow-50'
                              : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                            }`}
                            title={isSeed ? 'Cannot deactivate seed account' : ''}
                          >
                            {isLoading ? '...' : user.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(user)}
                            disabled={isSelf || isSeed || isLoading}
                            className="px-3 py-1.5 text-xs border border-red-200 text-red-600
                                       rounded-lg hover:bg-red-50 disabled:opacity-40
                                       disabled:cursor-not-allowed transition-colors"
                            title={isSeed ? 'Cannot delete seed account' : ''}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          {total > 20 && (
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                Showing {page * 20 + 1}–{Math.min((page + 1) * 20, total)} of {total}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg
                             hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Prev
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={(page + 1) * 20 >= total}
                  className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg
                             hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={(user) => {
            setUsers((prev) => [user, ...prev]);
            setTotal((t) => t + 1);
            setShowCreate(false);
          }}
        />
      )}

      {editingUser && (
        <EditRolesModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onUpdated={(updated) => {
            setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
            setEditingUser(null);
          }}
        />
      )}
    </div>
  );
}