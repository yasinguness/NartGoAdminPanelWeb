import { api } from './api';

/**
 * Büyüklerden ses kaydı inceleme kuyruğu (yönetici ve Köy Editörü).
 * Sunucu: auth-service HeritageVoiceService. Bkz. docs/plan/nartgo-koy-geri-gelme.md
 */
const ROOT = '/auth/heritage/admin/voices';

const unwrap = <T,>(response: { data: unknown }): T => {
  const body = response.data as { data?: T } | T;
  return (body && typeof body === 'object' && 'data' in (body as object) ? (body as { data: T }).data : body) as T;
};

export type VoicePrompt = 'founding' | 'old_name' | 'migration' | 'daily_life' | 'free';
export type VoiceStatus = 'pending' | 'published';
export type VoiceDecision = 'approve' | 'reject' | 'remove';

export const VOICE_PROMPT_LABEL: Record<VoicePrompt, string> = {
  founding: 'Köy nasıl kuruldu?',
  old_name: 'Köyün eski adı neydi?',
  migration: 'Aile köye nereden geldi?',
  daily_life: 'Eskiden köyde hayat nasıldı?',
  free: 'Başka bir hatıra',
};

export interface VoiceMemory {
  id: string;
  prompt: VoicePrompt;
  title: string | null;
  narratorName: string;
  audioUrl: string;
  durationSeconds: number;
  status: VoiceStatus;
  createdAt: string;
  villageName: string;
  villageSlug: string;
  authorName: string | null;
  authorEmail: string | null;
  listens: number;
}

export const heritageVoiceService = {
  /** pending: inceleme bekleyenler (eskiden yeniye). published: yayındakiler. */
  async queue(status: VoiceStatus = 'pending', config?: Record<string, unknown>): Promise<{ items: VoiceMemory[]; pending: number }> {
    return unwrap(await api.get(ROOT, { ...config, params: { status } }));
  },
  /** approve ve reject incelemedeki kayıt için, remove yayındaki kayıt için. Ret ve kaldırmada ses dosyası silinir. */
  async decide(id: string, decision: VoiceDecision, note?: string): Promise<void> {
    await api.post(`${ROOT}/${id}/decision`, { decision, note });
  },
};
