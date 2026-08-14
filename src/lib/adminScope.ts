import { AdminRoleUser, AdminScope, City, Franchise } from '@/lib/supabase';

export interface ScopeContext {
  scope: AdminScope;
  city_id?: string | null;
  franchise_id?: string | null;
}

/**
 * Admin kullanıcısının yetki kapsamını (global, city, franchise) ve bağlı olduğu ID'leri döner.
 */
export function getAdminScopeContext(user?: AdminRoleUser | null): ScopeContext {
  if (!user) {
    return { scope: 'global' };
  }
  return {
    scope: user.scope || 'global',
    city_id: user.city_id || null,
    franchise_id: user.franchise_id || null,
  };
}

/**
 * Admin kullanıcısının belirli bir şehre erişim izni olup olmadığını denetler.
 */
export function canAccessCity(user: AdminRoleUser | null | undefined, cityId?: string | null): boolean {
  if (!user) return true;
  const { scope, city_id } = getAdminScopeContext(user);
  if (scope === 'global') return true;
  if (!cityId) return true; // Genel kayıtlar
  return city_id === cityId;
}

/**
 * Admin kullanıcısının belirli bir bayiye erişim izni olup olmadığını denetler.
 */
export function canAccessFranchise(user: AdminRoleUser | null | undefined, franchiseId?: string | null, cityId?: string | null): boolean {
  if (!user) return true;
  const { scope, city_id, franchise_id } = getAdminScopeContext(user);
  if (scope === 'global') return true;
  if (scope === 'city') {
    if (!cityId) return true;
    return city_id === cityId;
  }
  if (scope === 'franchise') {
    if (!franchiseId) return true;
    return franchise_id === franchiseId;
  }
  return true;
}

/**
 * Verilen entity listesini kullanıcının scope seviyesine göre süzer.
 */
export function filterByScope<T extends { city_id?: string | null; franchise_id?: string | null }>(
  items: T[],
  user: AdminRoleUser | null | undefined
): T[] {
  if (!user) return items;
  const { scope, city_id, franchise_id } = getAdminScopeContext(user);
  if (scope === 'global') return items;

  return items.filter(item => {
    if (scope === 'city') {
      // Şehir admini: kendi şehrindeki verileri veya şehri henüz atanmamış genel verileri görür
      if (!item.city_id) return true;
      return item.city_id === city_id;
    }
    if (scope === 'franchise') {
      // Bayi admini: kendi bayisindeki verileri görür
      if (!item.franchise_id) return true;
      return item.franchise_id === franchise_id;
    }
    return true;
  });
}

/**
 * Scope için kullanıcı dostu Türkçe etiket döner.
 */
export function getScopeLabel(scope?: AdminScope): string {
  switch (scope) {
    case 'global':
      return 'Genel Merkez (Tüm Türkiye)';
    case 'city':
      return 'İl / Şehir Yöneticisi';
    case 'franchise':
      return 'Bayi Yöneticisi';
    default:
      return 'Genel Merkez';
  }
}
