import api from './api';

export function trackFunnelEvent(sessionId: string, step: number, event: 'step_viewed' | 'submitted'): void {
  api.post('/funnel/events', { session_id: sessionId, step, event }).catch(() => {
    // La analítica nunca debe interrumpir el flujo del formulario
  });
}

export interface FunnelMetrics {
  steps: Record<number, number>;
  submitted: number;
}

export async function getFunnelMetrics(): Promise<FunnelMetrics> {
  const res = await api.get<FunnelMetrics>('/admin/funnel');
  return res.data;
}
