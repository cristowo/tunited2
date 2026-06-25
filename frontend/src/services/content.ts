import api from './api';
import { SiteContent } from '../types';

export async function getSiteContent(): Promise<SiteContent> {
  const res = await api.get<SiteContent>('/content');
  return res.data;
}

export async function updateSiteContent(content: SiteContent): Promise<SiteContent> {
  const res = await api.put<SiteContent>('/admin/content', content);
  return res.data;
}

export async function uploadContentImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('image', file);
  const res = await api.post<{ url: string }>('/admin/content/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return `/api${res.data.url}`;
}
