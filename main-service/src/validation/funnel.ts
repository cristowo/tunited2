/**
 * Validación pura del payload de eventos del embudo (POST /funnel/events).
 * Sin dependencias de Express ni BD para poder testearla de forma aislada.
 */

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const MAX_STEP = 3;
export const VALID_EVENTS = ['step_viewed', 'submitted'] as const;

export interface ValidatedFunnelEvent {
  session_id: string;
  step: number;
  event: 'step_viewed' | 'submitted';
}

export type FunnelValidationResult = { error: string } | { data: ValidatedFunnelEvent };

export function validateFunnelEvent(body: any): FunnelValidationResult {
  const { session_id, step, event } = body ?? {};

  if (!session_id || typeof session_id !== 'string' || !UUID_REGEX.test(session_id)) {
    return { error: 'session_id inválido' };
  }

  if (typeof step !== 'number' || !Number.isInteger(step) || step < 0 || step > MAX_STEP) {
    return { error: `step debe ser un entero entre 0 y ${MAX_STEP}` };
  }

  if (typeof event !== 'string' || !VALID_EVENTS.includes(event as any)) {
    return { error: `event debe ser uno de: ${VALID_EVENTS.join(', ')}` };
  }

  return { data: { session_id, step, event: event as 'step_viewed' | 'submitted' } };
}
