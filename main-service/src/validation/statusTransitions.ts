/**
 * Máquina de estados de una cotización:
 *   pending → reviewed → quoted → confirmed
 * `cancelled` es alcanzable desde cualquier estado no terminal.
 * No se permite retroceder ni salir de un estado terminal.
 */

export const VALID_STATUSES = ['pending', 'reviewed', 'quoted', 'confirmed', 'cancelled'] as const;
export type QuoteStatus = (typeof VALID_STATUSES)[number];

const TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  pending:   ['reviewed', 'quoted', 'cancelled'],
  reviewed:  ['quoted', 'cancelled'],
  quoted:    ['confirmed', 'cancelled'],
  confirmed: ['cancelled'],
  cancelled: [],
};

export function isValidStatus(status: unknown): status is QuoteStatus {
  return typeof status === 'string' && (VALID_STATUSES as readonly string[]).includes(status);
}

export function allowedTransitions(from: QuoteStatus): QuoteStatus[] {
  return TRANSITIONS[from] ?? [];
}

export function canTransition(from: QuoteStatus, to: QuoteStatus): boolean {
  return allowedTransitions(from).includes(to);
}
