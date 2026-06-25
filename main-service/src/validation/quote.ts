/**
 * Validación pura del payload de creación de cotización (POST /quotes).
 * Sin dependencias de Express ni BD para poder testearla de forma aislada.
 */

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const PHONE_REGEX = /^\+56[2-9]\d{8}$/;
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const VALID_TRUCK_DISTANCES = [0, 10, 20, 50, 99];
export const MAX_ITEMS = 100;
export const MAX_CUSTOM_ITEMS = 20;
export const MAX_QUANTITY_PER_ITEM = 50;
export const MAX_CUSTOM_M3 = 1000;
export const MAX_ITEM_NOTES = 200;

export interface ValidatedItem {
  item_id: string | null;
  custom_name: string | null;
  custom_m3: number | null;
  quantity: number;
  is_fragile: boolean;
  notes: string | null;
}

export interface ValidatedQuote {
  client_name: string;
  client_email: string;
  client_phone: string;
  move_date: string | null;
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
  notes: string | null;
  consent_text: string | null;
  items: ValidatedItem[];
  /** IDs de catálogo a verificar contra la BD */
  catalogItemIds: string[];
}

export type ValidationResult = { error: string } | { data: ValidatedQuote };

function isValidDate(dateStr: string): boolean {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date < today) return false;
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 6);
  return date <= maxDate;
}

export function validateQuotePayload(body: any): ValidationResult {
  const {
    client_name, client_email, client_phone, move_date,
    origin_address, origin_is_apartment, origin_floor, origin_elevator, origin_truck_distance_m,
    dest_address, dest_is_apartment, dest_floor, dest_elevator, dest_truck_distance_m,
    notes, consent_accepted, consent_text, items,
  } = body ?? {};

  // --- Datos personales ---
  if (!client_name || typeof client_name !== 'string' || client_name.trim().length < 3 || client_name.trim().length > 100) {
    return { error: 'El nombre debe tener entre 3 y 100 caracteres' };
  }
  if (!client_email || typeof client_email !== 'string' || !EMAIL_REGEX.test(client_email) || client_email.length > 255) {
    return { error: 'Correo electrónico inválido' };
  }
  if (!client_phone || typeof client_phone !== 'string' || !PHONE_REGEX.test(client_phone)) {
    return { error: 'Teléfono inválido. Formato requerido: +56XXXXXXXXX' };
  }

  // --- Fecha ---
  if (move_date && (typeof move_date !== 'string' || !isValidDate(move_date))) {
    return { error: 'Fecha de mudanza inválida o fuera de rango (máximo 6 meses)' };
  }

  // --- Direcciones ---
  if (!origin_address || typeof origin_address !== 'string' || origin_address.trim().length < 5 || origin_address.trim().length > 300) {
    return { error: 'La dirección de origen debe tener entre 5 y 300 caracteres' };
  }
  if (!dest_address || typeof dest_address !== 'string' || dest_address.trim().length < 5 || dest_address.trim().length > 300) {
    return { error: 'La dirección de destino debe tener entre 5 y 300 caracteres' };
  }

  // --- Pisos ---
  const originFloor = Number(origin_floor) || 0;
  const destFloor = Number(dest_floor) || 0;
  if (origin_is_apartment && (originFloor < 1 || originFloor > 50)) {
    return { error: 'El piso de origen debe estar entre 1 y 50' };
  }
  if (dest_is_apartment && (destFloor < 1 || destFloor > 50)) {
    return { error: 'El piso de destino debe estar entre 1 y 50' };
  }

  // --- Distancia al camión ---
  const originDistance = Number(origin_truck_distance_m) || 0;
  const destDistance = Number(dest_truck_distance_m) || 0;
  if (!VALID_TRUCK_DISTANCES.includes(originDistance)) {
    return { error: 'Distancia al camión de origen inválida' };
  }
  if (!VALID_TRUCK_DISTANCES.includes(destDistance)) {
    return { error: 'Distancia al camión de destino inválida' };
  }

  // --- Notas ---
  if (notes && (typeof notes !== 'string' || notes.length > 500)) {
    return { error: 'Las notas no pueden superar 500 caracteres' };
  }

  // --- Consentimiento ---
  if (!consent_accepted) {
    return { error: 'Se requiere aceptar el consentimiento de datos' };
  }

  // --- Ítems ---
  if (!Array.isArray(items) || items.length === 0) {
    return { error: 'Debes incluir al menos un ítem' };
  }
  if (items.length > MAX_ITEMS) {
    return { error: `No puedes incluir más de ${MAX_ITEMS} ítems` };
  }

  let customCount = 0;
  const catalogItemIds: string[] = [];
  const validatedItems: ValidatedItem[] = [];

  for (const item of items) {
    const hasCatalog = !!item?.item_id;
    const hasCustom = !!item?.custom_name;

    if (!hasCatalog && !hasCustom) {
      return { error: 'Cada ítem debe tener item_id o custom_name' };
    }
    if (hasCatalog && hasCustom) {
      return { error: 'Un ítem no puede tener item_id y custom_name a la vez' };
    }

    if (hasCatalog) {
      if (typeof item.item_id !== 'string' || !UUID_REGEX.test(item.item_id)) {
        return { error: 'ID de ítem con formato inválido' };
      }
      catalogItemIds.push(item.item_id);
    }

    let customM3: number | null = null;
    if (hasCustom) {
      customCount++;
      if (typeof item.custom_name !== 'string' || item.custom_name.trim().length < 2 || item.custom_name.trim().length > 100) {
        return { error: 'El nombre del ítem personalizado debe tener entre 2 y 100 caracteres' };
      }
      // custom_m3 es opcional, pero si viene debe ser un número positivo y razonable
      if (item.custom_m3 !== undefined && item.custom_m3 !== null && item.custom_m3 !== '') {
        const m3 = Number(item.custom_m3);
        if (!Number.isFinite(m3) || m3 <= 0 || m3 > MAX_CUSTOM_M3) {
          return { error: `Los m³ del ítem personalizado deben ser un número entre 0 y ${MAX_CUSTOM_M3}` };
        }
        customM3 = m3;
      }
    }

    if (!item.quantity || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_QUANTITY_PER_ITEM) {
      return { error: `La cantidad de cada ítem debe ser entre 1 y ${MAX_QUANTITY_PER_ITEM}` };
    }

    if (item.notes && (typeof item.notes !== 'string' || item.notes.length > MAX_ITEM_NOTES)) {
      return { error: `Las notas de un ítem no pueden superar ${MAX_ITEM_NOTES} caracteres` };
    }

    validatedItems.push({
      item_id: hasCatalog ? item.item_id : null,
      custom_name: hasCustom ? item.custom_name.trim() : null,
      custom_m3: customM3,
      quantity: item.quantity,
      is_fragile: item.is_fragile ?? false,
      notes: item.notes?.trim() || null,
    });
  }

  if (customCount > MAX_CUSTOM_ITEMS) {
    return { error: `No puedes incluir más de ${MAX_CUSTOM_ITEMS} ítems personalizados` };
  }

  return {
    data: {
      client_name: client_name.trim(),
      client_email: client_email.trim().toLowerCase(),
      client_phone,
      move_date: move_date || null,
      origin_address: origin_address.trim(),
      origin_is_apartment: origin_is_apartment ?? false,
      origin_floor: originFloor,
      origin_elevator: origin_elevator ?? false,
      origin_truck_distance_m: originDistance,
      dest_address: dest_address.trim(),
      dest_is_apartment: dest_is_apartment ?? false,
      dest_floor: destFloor,
      dest_elevator: dest_elevator ?? false,
      dest_truck_distance_m: destDistance,
      notes: notes?.trim() || null,
      consent_text: consent_text || null,
      items: validatedItems,
      catalogItemIds,
    },
  };
}
