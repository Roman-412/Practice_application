import { api } from './api';
import { ChapterDetail, ChapterSummary, FileUploadResult } from '../types';

export interface ChapterListResponse {
  chapters: ChapterSummary[];
  categories: string[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export async function getChapters(params?: {
  search?: string;
  category?: string;
  sort?: 'newest' | 'oldest' | 'title';
  page?: number;
  limit?: number;
}): Promise<ChapterListResponse> {
  const res = await api.get<{ data: ChapterListResponse }>('/chapters', { params });
  return res.data.data;
}

export async function getChapterById(id: string): Promise<ChapterDetail> {
  const res = await api.get<{ data: { chapter: ChapterDetail } }>(`/chapters/${id}`);
  return res.data.data.chapter;
}

export async function updateChapter(
  id: string,
  payload: {
    title?: string;
    description?: string;
    category?: string;
    instructions?: string | null;
    isActive?: boolean;
  }
): Promise<ChapterSummary> {
  const res = await api.put<{ data: { chapter: ChapterSummary } }>(`/chapters/${id}`, payload);
  return res.data.data.chapter;
}

export async function deleteChapter(id: string): Promise<void> {
  await api.delete(`/chapters/${id}`);
}

export async function uploadChapterFiles(
  files: File[],
  onProgress?: (percent: number) => void
): Promise<FileUploadResult[]> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });

  const res = await api.post<{ data: { results: FileUploadResult[] } }>(
    '/chapters/upload',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      validateStatus: (status) => status >= 200 && status < 500,
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    }
  );

  if (res.data?.data?.results) {
    return res.data.data.results;
  }

  throw new Error('Unexpected response from upload endpoint');
}
