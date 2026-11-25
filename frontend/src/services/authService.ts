import { api } from './api';
import { HealthStatus, User } from '../types';

export async function register(payload: {
  name: string;
  email: string;
  password: string;
}): Promise<User> {
  const res = await api.post<{ data: { user: User } }>('/auth/register', payload);
  return res.data.data.user;
}

export async function login(payload: {
  email: string;
  password: string;
}): Promise<User> {
  const res = await api.post<{ data: { user: User } }>('/auth/login', payload);
  return res.data.data.user;
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}

export async function getCurrentUser(): Promise<User> {
  const res = await api.get<{ data: { user: User } }>('/auth/me');
  return res.data.data.user;
}

export async function updateProfile(payload: {
  name?: string;
  currentPassword?: string;
  newPassword?: string;
}): Promise<User> {
  const res = await api.put<{ data: { user: User } }>('/auth/me', payload);
  return res.data.data.user;
}

export async function checkHealth(): Promise<HealthStatus> {
  const res = await api.get<HealthStatus>('/health');
  return res.data;
}
