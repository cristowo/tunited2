/**
 * Validación pura del contenido editable del landing (PUT /admin/content).
 * Sin dependencias de Express ni BD para poder testearla de forma aislada.
 */

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const MAX_FEATURES = 10;
export const MAX_SERVICES = 20;
export const MAX_PORTFOLIO = 30;
export const MAX_FOOTER_VALUES = 15;

export interface AboutFeature { icon: string; title: string; text: string }
export interface ServiceItem { icon: string; title: string; text: string }
export interface PortfolioImage { url: string; alt: string }

export interface SiteContentData {
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

export type SiteContentValidationResult = { error: string } | { data: SiteContentData };

function isStr(v: any, max: number, min = 0): boolean {
  return typeof v === 'string' && v.length >= min && v.length <= max;
}

function validateFeatureList(list: any, label: string, max: number): string | null {
  if (!Array.isArray(list) || list.length > max) {
    return `${label} debe ser una lista de hasta ${max} elementos`;
  }
  for (const item of list) {
    if (!item || !isStr(item.icon, 20) || !isStr(item.title, 100, 1) || !isStr(item.text, 500)) {
      return `${label} tiene un elemento inválido (icon/title/text)`;
    }
  }
  return null;
}

export function validateSiteContent(body: any): SiteContentValidationResult {
  const { hero, about, services, portfolio, footerValues, contact, whatsappNumber } = body ?? {};

  if (!hero || !isStr(hero.title, 200, 1)) {
    return { error: 'hero.title inválido' };
  }

  if (!about) return { error: 'about requerido' };
  if (!isStr(about.intro, 3000)) return { error: 'about.intro inválido' };
  if (!isStr(about.whyUsTitle, 200)) return { error: 'about.whyUsTitle inválido' };
  if (!isStr(about.whyUsText1, 2000)) return { error: 'about.whyUsText1 inválido' };
  if (!isStr(about.whyUsText2, 2000)) return { error: 'about.whyUsText2 inválido' };
  if (!isStr(about.motto, 200)) return { error: 'about.motto inválido' };
  const featuresError = validateFeatureList(about.features, 'about.features', MAX_FEATURES);
  if (featuresError) return { error: featuresError };

  const servicesError = validateFeatureList(services, 'services', MAX_SERVICES);
  if (servicesError) return { error: servicesError };

  if (!Array.isArray(portfolio) || portfolio.length > MAX_PORTFOLIO) {
    return { error: `portfolio debe ser una lista de hasta ${MAX_PORTFOLIO} elementos` };
  }
  for (const img of portfolio) {
    if (!img || !isStr(img.url, 500, 1) || !isStr(img.alt, 200)) {
      return { error: 'portfolio tiene un elemento inválido (url/alt)' };
    }
  }

  if (!Array.isArray(footerValues) || footerValues.length > MAX_FOOTER_VALUES) {
    return { error: `footerValues debe ser una lista de hasta ${MAX_FOOTER_VALUES} elementos` };
  }
  for (const v of footerValues) {
    if (!isStr(v, 150, 1)) return { error: 'footerValues tiene un elemento inválido' };
  }

  if (!contact) return { error: 'contact requerido' };
  if (!isStr(contact.address, 300)) return { error: 'contact.address inválido' };
  if (!isStr(contact.addressFull, 400)) return { error: 'contact.addressFull inválido' };
  if (contact.email && (!isStr(contact.email, 255) || !EMAIL_REGEX.test(contact.email))) {
    return { error: 'contact.email inválido' };
  }
  if (!isStr(contact.phone, 30)) return { error: 'contact.phone inválido' };
  if (!isStr(contact.phoneHref, 60)) return { error: 'contact.phoneHref inválido' };
  if (!isStr(contact.facebook, 400)) return { error: 'contact.facebook inválido' };
  if (!isStr(contact.mapEmbedUrl, 2000)) return { error: 'contact.mapEmbedUrl inválido' };

  if (!isStr(whatsappNumber, 20)) return { error: 'whatsappNumber inválido' };
  if (whatsappNumber && !/^\d*$/.test(whatsappNumber)) {
    return { error: 'whatsappNumber debe contener solo dígitos' };
  }

  return {
    data: {
      hero: { title: hero.title.trim() },
      about: {
        intro: about.intro.trim(),
        features: about.features,
        whyUsTitle: about.whyUsTitle.trim(),
        whyUsText1: about.whyUsText1.trim(),
        whyUsText2: about.whyUsText2.trim(),
        motto: about.motto.trim(),
      },
      services,
      portfolio,
      footerValues,
      contact: {
        address: contact.address.trim(),
        addressFull: contact.addressFull.trim(),
        email: (contact.email ?? '').trim(),
        phone: contact.phone.trim(),
        phoneHref: contact.phoneHref.trim(),
        facebook: contact.facebook.trim(),
        mapEmbedUrl: contact.mapEmbedUrl.trim(),
      },
      whatsappNumber: whatsappNumber.trim(),
    },
  };
}
