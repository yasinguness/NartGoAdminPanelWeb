/**
 * Üye detayının sağ paneli — üç kart, hep aynı sırada.
 *
 * Sıra tesadüf değil, aciliyet sırası: **dönem** (para ve süre, tek koyu
 * kart), sonra **tamlık** (eksik alanlar, her biri tek tıkla istenebilir),
 * sonra **hareketler** (ne olduğu). Üstteki karar gerektirir, alttaki yalnız
 * bilgi verir.
 *
 * Dönem kartı koyu: sayfadaki tek koyu yüzey olduğu için göz oraya önce
 * gider, ve gitmesi gereken yer orası. İkinci bir koyu kart eklenirse bu
 * işaret değerini kaybeder.
 */

import type { ReactNode } from 'react';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { nb, nbRadius, nbType } from '../../../theme/nbBrand';

/* ── Ortak parçalar ──────────────────────────────────────────────────── */

/** İnce ilerleme çubuğu — yüzde değeri zaten yanında yazılı olduğu için etiketsiz. */
function Meter({ value, color, track }: { value: number; color: string; track: string }) {
    return (
        <Box sx={{ height: 5, bgcolor: track, borderRadius: '3px', mt: 1.375, overflow: 'hidden' }}>
            <Box sx={{ height: '100%', width: `${Math.max(0, Math.min(100, value))}%`, bgcolor: color }} />
        </Box>
    );
}

function RailCard({ children }: { children: ReactNode }) {
    return (
        <Paper
            elevation={0}
            sx={{
                bgcolor: nb.surface,
                border: `1px solid ${nb.border}`,
                borderRadius: `${nbRadius.card}px`,
                px: 2, py: 1.75,
            }}
        >
            {children}
        </Paper>
    );
}

function RailLabel({ children, onDark }: { children: ReactNode; onDark?: boolean }) {
    return (
        <Typography sx={{ ...nbType.label, letterSpacing: '0.14em', color: onDark ? nb.onDarkMuted : nb.textFaint }}>
            {children}
        </Typography>
    );
}

/* ── Üyelik dönemi ───────────────────────────────────────────────────── */

interface NbPeriodCardProps {
    /** "Standart yıllık · ₺12.000" */
    title: string;
    /** "31 Ağu 2026 – 31 Ağu 2027 · 11 ay kaldı" */
    range: string;
    /** Dönemin tükenmiş yüzdesi. */
    progress: number;
    /** Son tarih uyarısı — yoksa bölüm hiç çizilmez. */
    deadline?: { title: string; detail: string };
    primary?: { label: string; onClick: () => void };
    secondary?: { label: string; onClick: () => void };
}

export function NbPeriodCard({ title, range, progress, deadline, primary, secondary }: NbPeriodCardProps) {
    return (
        <Paper
            elevation={0}
            sx={{ bgcolor: nb.navy, color: nb.onDark, borderRadius: `${nbRadius.card}px`, p: 2 }}
        >
            <RailLabel onDark>ÜYELİK DÖNEMİ</RailLabel>
            <Typography sx={{ fontSize: 15, fontWeight: 600, mt: 0.875 }}>{title}</Typography>
            <Typography sx={{ fontSize: 11.5, color: nb.onDarkMuted, mt: 0.375 }}>{range}</Typography>

            <Meter value={progress} color={nb.gold} track="rgba(255,255,255,.12)" />

            {deadline && (
                <Box sx={{ mt: 1.625, pt: 1.5, borderTop: `1px solid ${nb.onDarkLine}` }}>
                    <Typography sx={{ fontSize: 12, color: '#e7c37a', fontWeight: 600 }}>
                        {deadline.title}
                    </Typography>
                    <Typography sx={{ fontSize: 11.5, color: nb.onDarkMuted, lineHeight: 1.55, mt: 0.5 }}>
                        {deadline.detail}
                    </Typography>
                </Box>
            )}

            {(primary || secondary) && (
                <Stack direction="row" sx={{ gap: 0.875, mt: 1.5 }}>
                    {primary && (
                        <Button
                            disableElevation
                            onClick={primary.onClick}
                            sx={{
                                flex: 1, bgcolor: nb.gold, color: nb.navy, borderRadius: `${nbRadius.control}px`,
                                py: 1.125, fontSize: 12, fontWeight: 600, textTransform: 'none',
                                '&:hover': { bgcolor: '#c2952d' },
                            }}
                        >
                            {primary.label}
                        </Button>
                    )}
                    {secondary && (
                        <Button
                            disableElevation
                            onClick={secondary.onClick}
                            sx={{
                                flex: 1, border: '1px solid rgba(255,255,255,.18)', color: '#cfd8de',
                                borderRadius: `${nbRadius.control}px`, py: 1.125, fontSize: 12,
                                textTransform: 'none', '&:hover': { bgcolor: 'rgba(255,255,255,.06)' },
                            }}
                        >
                            {secondary.label}
                        </Button>
                    )}
                </Stack>
            )}
        </Paper>
    );
}

/* ── Profil tamlığı ──────────────────────────────────────────────────── */

export interface NbMissingField {
    name: string;
    /** Eksik alanı üyeden isteme — her satırın kendi tek aksiyonu. */
    onRequest?: () => void;
}

export function NbCompletenessCard({ percent, missing }: { percent: number; missing: NbMissingField[] }) {
    return (
        <RailCard>
            <RailLabel>PROFİL TAMLIĞI</RailLabel>
            <Stack direction="row" alignItems="baseline" sx={{ gap: 1, mt: 0.75 }}>
                <Typography sx={{ fontSize: 22, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    %{percent}
                </Typography>
                <Typography sx={{ fontSize: 11.5, color: nb.textFaint }}>
                    {missing.length ? `${missing.length} alan eksik` : 'eksik alan yok'}
                </Typography>
            </Stack>

            <Meter value={percent} color={nb.green} track="#eeebe3" />

            {missing.length > 0 && (
                <Stack sx={{ gap: 0.875, mt: 1.375 }}>
                    {missing.map((m) => (
                        <Stack key={m.name} direction="row" alignItems="center" sx={{ gap: 1 }}>
                            <Typography sx={{ fontSize: 12, color: '#4a545c' }}>{m.name}</Typography>
                            {m.onRequest && (
                                <Button
                                    onClick={m.onRequest}
                                    sx={{
                                        ml: 'auto', minWidth: 0, p: 0, color: nb.green, fontSize: 11.5,
                                        fontWeight: 600, textTransform: 'none',
                                        '&:hover': { bgcolor: 'transparent', color: nb.greenDeep },
                                    }}
                                >
                                    iste →
                                </Button>
                            )}
                        </Stack>
                    ))}
                </Stack>
            )}
        </RailCard>
    );
}

/* ── Son hareketler ──────────────────────────────────────────────────── */

export interface NbTimelineEntry {
    text: string;
    when: string;
    /** Olayın ağırlığı: bekleyen (altın), olumlu (yeşil), arşiv (soluk). */
    tone?: 'pending' | 'good' | 'past';
}

const DOT: Record<NonNullable<NbTimelineEntry['tone']>, string> = {
    pending: nb.gold,
    good: nb.green,
    past: '#c9c3b4',
};

export function NbTimelineCard({ title = 'SON HAREKETLER', entries }: { title?: string; entries: NbTimelineEntry[] }) {
    return (
        <RailCard>
            <RailLabel>{title}</RailLabel>
            <Stack sx={{ gap: 1.375, mt: 1.375 }}>
                {entries.map((e, i) => (
                    <Stack key={`${e.text}-${i}`} direction="row" sx={{ gap: 1.125 }}>
                        <Box
                            sx={{
                                width: 7, height: 7, borderRadius: '50%', flexShrink: 0, mt: 0.625,
                                bgcolor: DOT[e.tone ?? 'past'],
                            }}
                        />
                        <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontSize: 12, lineHeight: 1.4 }}>{e.text}</Typography>
                            <Typography sx={{ fontSize: 10.5, color: nb.textFaint, mt: 0.25 }}>{e.when}</Typography>
                        </Box>
                    </Stack>
                ))}
            </Stack>
        </RailCard>
    );
}
