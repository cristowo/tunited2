import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAdminQuotes,
  getAdminQuote,
  getItems,
  getMetrics,
  updateQuoteStatus,
  updateQuotePrice,
  updateQuoteNotes,
  deleteQuote,
  getAdminItems,
  createItem,
  updateItem,
  ItemPayload,
} from '../services/quotes';
import { getFunnelMetrics } from '../services/funnel';

export function useItems() {
  return useQuery({
    queryKey: ['items'],
    queryFn: getItems,
    staleTime: 1000 * 60 * 10,
  });
}

export function useAdminQuotes(params?: { status?: string; page?: number; search?: string }) {
  return useQuery({
    queryKey: ['admin-quotes', params],
    queryFn: () => getAdminQuotes(params),
  });
}

export function useAdminQuote(id: string) {
  return useQuery({
    queryKey: ['admin-quote', id],
    queryFn: () => getAdminQuote(id),
    enabled: !!id,
  });
}

export function useMetrics() {
  return useQuery({
    queryKey: ['metrics'],
    queryFn: getMetrics,
    refetchInterval: 30_000,
  });
}

export function useFunnelMetrics() {
  return useQuery({
    queryKey: ['funnel-metrics'],
    queryFn: getFunnelMetrics,
    refetchInterval: 30_000,
  });
}

export function useUpdateStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateQuoteStatus(id, status),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-quotes'] });
      queryClient.invalidateQueries({ queryKey: ['admin-quote', id] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
    },
  });
}

export function useUpdatePrice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, price }: { id: string; price: number }) =>
      updateQuotePrice(id, price),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-quotes'] });
      queryClient.invalidateQueries({ queryKey: ['admin-quote', id] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
    },
  });
}

export function useUpdateNotes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      updateQuoteNotes(id, notes),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-quote', id] });
    },
  });
}

export function useDeleteQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteQuote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-quotes'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
    },
  });
}

// ── Catálogo (admin) ───────────────────────────────────────────────────────────

export function useAdminItems() {
  return useQuery({
    queryKey: ['admin-items'],
    queryFn: getAdminItems,
  });
}

export function useCreateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ItemPayload) => createItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-items'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
}

export function useUpdateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ItemPayload> & { is_active?: boolean } }) =>
      updateItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-items'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
}
