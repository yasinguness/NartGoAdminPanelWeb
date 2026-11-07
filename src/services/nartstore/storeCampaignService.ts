import { api } from '../api';
import { commerceOrigin } from './storeActivityService';

/**
 * NartStore kampanyası (Efsane Cuma vb.) için herkese açık durum ucu. Kampanya yönetimi NartStore
 * panelinde (store.nartgo.net/panel/platform/kampanyalar) ve yalnız mağaza süper yöneticisine açık;
 * bu panel durumu gösterir, süreci anlatır ve oraya bağlantı verir.
 */
const BASE = `${commerceOrigin(
  import.meta.env.VITE_API_BASE_URL || 'https://api.nartgo.net/api/v1',
  import.meta.env.DEV,
  typeof window !== 'undefined' ? window.location.origin : '',
  import.meta.env.VITE_COMMERCE_ORIGIN,
)}/v1/commerce`;

export interface CurrentStoreCampaign {
  slug: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  status: 'LIVE' | 'UPCOMING';
  productCount?: number;
}

export const STORE_CAMPAIGN_ADMIN_URL = 'https://store.nartgo.net/panel/platform/kampanyalar';
export const storeCampaignPageUrl = (slug: string) => `https://store.nartgo.net/kampanya/${slug}`;

export const storeCampaignService = {
  /** Yayındaki ya da 14 gün içinde başlayacak kampanya; yoksa null. */
  async current(): Promise<CurrentStoreCampaign | null> {
    const res = await api.get<CurrentStoreCampaign | ''>(`${BASE}/campaigns/current`);
    const data = res.data;
    return data && typeof data === 'object' && data.slug ? data : null;
  },
};
