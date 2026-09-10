import { api } from '../api';
import type { CouponListResponse, CouponRequest, Coupon } from './couponTypes';

const BASE = '/tickets/admin/coupons';

function unwrap<T>(body: any): T | null {
  if (!body) return null;
  if (typeof body === 'object' && 'data' in body && 'success' in body) return (body.data ?? null) as T | null;
  return body as T;
}

async function list(): Promise<CouponListResponse | null> {
  try {
    const res = await api.get<any>(BASE);
    return unwrap<CouponListResponse>(res.data);
  } catch (err: any) {
    const code = err?.response?.status;
    if (code === 404 || code === 501 || code === 403) return null;
    throw err;
  }
}

async function create(payload: CouponRequest): Promise<Coupon | null> {
  const res = await api.post<any>(BASE, payload);
  return unwrap<Coupon>(res.data);
}

async function update(id: string, payload: CouponRequest): Promise<Coupon | null> {
  const res = await api.put<any>(`${BASE}/${id}`, payload);
  return unwrap<Coupon>(res.data);
}

async function remove(id: string): Promise<void> {
  await api.delete(`${BASE}/${id}`);
}

async function toggle(id: string): Promise<Coupon | null> {
  const res = await api.post<any>(`${BASE}/${id}/toggle`);
  return unwrap<Coupon>(res.data);
}

export const couponService = { list, create, update, remove, toggle };
