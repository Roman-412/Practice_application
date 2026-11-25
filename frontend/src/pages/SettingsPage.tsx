import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, Server, User as UserIcon, LogOut, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { extractApiError } from '../services/api';
import * as authService from '../services/authService';
import { HealthStatus } from '../types';

export function SettingsPage() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [healthError, setHealthError] = useState('');

  const [name, setName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    setName(user?.name || '');
  }, [user]);

  useEffect(() => {
    (async () => {
      try {
        const res = await authService.checkHealth();
        setHealth(res);
      } catch (err) {
        setHealthError(extractApiError(err, 'Backend API unreachable'));
      }
    })();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMessage('');
    setSaveError('');
    try {
      await authService.updateProfile({
        name: name.trim(),
        ...(newPassword ? { currentPassword, newPassword } : {}),
      });
      await refreshUser();
      setCurrentPassword('');
      setNewPassword('');
      setSaveMessage('Account settings updated successfully.');
    } catch (err) {
      setSaveError(extractApiError(err, 'Failed to update account settings.'));
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          System diagnostics, database status, and account management.
        </p>
      </div>

      {/* Infrastructure Status */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">
          Application & Infrastructure Status
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 flex items-start gap-3">
            <Server className="h-5 w-5 text-slate-600 mt-0.5" />
            <div>
              <div className="text-xs font-medium text-slate-500">Backend API</div>
              <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                {health && health.status === 'ok' ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Connected ({health.environment})
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-rose-600" />
                    {healthError || 'Checking...'}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 flex items-start gap-3">
            <Database className="h-5 w-5 text-slate-600 mt-0.5" />
            <div>
              <div className="text-xs font-medium text-slate-500">Neon PostgreSQL</div>
              <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                {health && health.database === 'connected' ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Connected
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-rose-600" />
                    Disconnected
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-500 pt-1">
          ChapterFlow v1.0.0 · React + TypeScript + Express + Prisma + Neon PostgreSQL
        </div>
      </div>

      {/* Account Settings */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
        <div className="flex items-center gap-2 mb-4">
          <UserIcon className="h-4 w-4 text-slate-600" />
          <h2 className="text-sm font-semibold text-slate-900">Account Settings</h2>
        </div>

        {saveMessage && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800">
            {saveMessage}
          </div>
        )}
        {saveError && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
            {saveError}
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-500"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-3">
              Change Password (optional)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium text-rose-600 bg-rose-50 hover:bg-rose-100"
            >
              <LogOut className="h-4 w-4" />
              Log Out
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
