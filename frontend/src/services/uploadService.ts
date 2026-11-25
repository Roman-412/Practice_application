import { api } from './api';
import { UploadHistoryItem } from '../types';

export async function getUploadHistory(): Promise<UploadHistoryItem[]> {
  const res = await api.get<{ data: { uploads: UploadHistoryItem[] } }>('/uploads/history');
  return res.data.data.uploads;
}
