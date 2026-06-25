import api from './api';
import { Quote, PaginatedResponse, ItemsByCategory, Item } from '../types';

export async function getItems(): Promise<ItemsByCategory> {
  const res = await api.get<ItemsByCategory>('/items');
  return res.data;
}

export async function getMetrics(): Promise<Record<string, number>> {
  const res = await api.get<Record<string, number>>('/admin/quotes/metrics');
  return res.data;
}

export interface CreateQuotePayload {
  client_name: string;
  client_email: string;
  client_phone?: string;
  move_date?: string;
  origin_address: string;
  origin_is_apartment: boolean;
  origin_floor: number;
  origin_elevator: boolean;
  origin_truck_distance_m: number;
  dest_address: string;
  dest_is_apartment: boolean;
  dest_floor: number;
  dest_elevator: boolean;
  dest_truck_distance_m: number;
  notes?: string;
  consent_accepted: boolean;
  consent_text: string;
  items: {
    item_id?: string;
    custom_name?: string;
    custom_m3?: number;
    quantity: number;
    is_fragile: boolean;
    notes?: string;
  }[];
}

export async function createQuote(data: CreateQuotePayload): Promise<Quote> {
  const res = await api.post<Quote>('/quotes', data);
  return res.data;
}

export async function getAdminQuotes(params?: {
  status?: string;
  page?: number;
  limit?: number;
  search?: string;
}): Promise<PaginatedResponse<Quote>> {
  const res = await api.get<PaginatedResponse<Quote>>('/admin/quotes', { params });
  return res.data;
}

export async function getAdminQuote(id: string): Promise<Quote> {
  const res = await api.get<Quote>(`/admin/quotes/${id}`);
  return res.data;
}

export async function updateQuoteStatus(id: string, status: string): Promise<void> {
  await api.patch(`/admin/quotes/${id}/status`, { status });
}

export async function updateQuotePrice(id: string, estimated_price: number): Promise<Quote> {
  const res = await api.patch<Quote>(`/admin/quotes/${id}/price`, { estimated_price });
  return res.data;
}

export async function updateQuoteNotes(id: string, admin_notes: string): Promise<Quote> {
  const res = await api.patch<Quote>(`/admin/quotes/${id}/notes`, { admin_notes });
  return res.data;
}

/** Eliminación de datos del cliente (Ley 21.719) */
export async function deleteQuote(id: string): Promise<void> {
  await api.delete(`/admin/quotes/${id}`);
}

// ── Catálogo (admin) ───────────────────────────────────────────────────────────

export async function getAdminItems(): Promise<Item[]> {
  const res = await api.get<Item[]>('/admin/items');
  return res.data;
}

export interface ItemPayload {
  name: string;
  category: string;
  dimensions?: string;
  description?: string;
}

export async function createItem(data: ItemPayload): Promise<Item> {
  const res = await api.post<Item>('/admin/items', data);
  return res.data;
}

export async function updateItem(id: string, data: Partial<ItemPayload> & { is_active?: boolean }): Promise<Item> {
  const res = await api.patch<Item>(`/admin/items/${id}`, data);
  return res.data;
}
