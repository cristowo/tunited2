export interface Item {
  id: string;
  category: string;
  name: string;
  description?: string;
  dimensions?: string;
  is_active: boolean;
}

export type ItemsByCategory = Record<string, Item[]>;

// Ítem seleccionado del catálogo
export interface SelectedCatalogItem {
  type: 'catalog';
  item_id: string;
  name: string;
  category: string;
  dimensions?: string;
  quantity: number;
  is_fragile: boolean;
}

// Ítem personalizado ingresado por el cliente
export interface SelectedCustomItem {
  type: 'custom';
  custom_name: string;
  custom_m3?: number;
  quantity: number;
  is_fragile: boolean;
  notes?: string;
}

export type SelectedItem = SelectedCatalogItem | SelectedCustomItem;

// Datos del formulario completo
export interface QuoteFormData {
  // Paso 1
  client_name: string;
  client_email: string;
  client_phone: string;
  consent_accepted: boolean;

  // Paso 2
  move_date: string;
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
  notes: string;

  // Paso 3
  items: SelectedItem[];
}

export type QuoteStatus = 'pending' | 'reviewed' | 'quoted' | 'confirmed' | 'cancelled';

export interface Quote {
  id: string;
  client_name: string;
  client_email: string;
  client_phone?: string;
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
  move_date?: string;
  notes?: string;
  status: QuoteStatus;
  admin_notes?: string;
  estimated_price?: number;
  consent_accepted: boolean;
  created_at: string;
  updated_at: string;
  items?: QuoteItemDetail[];
}

export interface QuoteItemDetail {
  id: string;
  item_id?: string;
  custom_name?: string;
  custom_m3?: number;
  name: string;
  category?: string;
  quantity: number;
  is_fragile: boolean;
  notes?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// ── Contenido editable del landing ──────────────────────────────────────────
export interface AboutFeature {
  icon: string;
  title: string;
  text: string;
}

export interface ServiceItem {
  icon: string;
  title: string;
  text: string;
}

export interface PortfolioImage {
  url: string;
  alt: string;
}

export interface SiteContent {
  hero: { title: string };
  about: {
    intro: string;
    features: AboutFeature[];
    whyUsTitle: string;
    whyUsText1: string;
    whyUsText2: string;
    motto: string;
  };
  services: ServiceItem[];
  portfolio: PortfolioImage[];
  footerValues: string[];
  contact: {
    address: string;
    addressFull: string;
    email: string;
    phone: string;
    phoneHref: string;
    facebook: string;
    mapEmbedUrl: string;
  };
  whatsappNumber: string;
}
