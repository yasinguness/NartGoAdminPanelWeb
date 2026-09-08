/**
 * Navigasyon tipleri — workspace'lerin ortak sözleşmesi.
 *
 * Nav tanımları eskiden Layout.tsx'in içinde 160 satırlık tek bir dizideydi.
 * İki workspace ortaya çıkınca o dizi ikiye ayrıldı; Layout artık hangi
 * listeyi çizeceğini bilmez, kendisine verilen bölümleri çizer.
 */

import type { ReactNode } from 'react';

export interface NavItem {
    text: string;
    icon: ReactNode;
    path: string;
    /**
     * Sadece görünürlük filtresi. Asıl yetki kararı her zaman
     * ROLE_ROUTE_MAP üzerinden `canAccess(path)` ile verilir; burası
     * menüyü sadeleştirmek içindir, güvenlik sınırı değildir.
     */
    allowedRoles?: string[];
}

export interface NavSection {
    title: string;
    items: NavItem[];
    /** Tüm öğeleri filtrelense bile bölümü tamamen gizlemek için. */
    allowedRoles?: string[];
}
