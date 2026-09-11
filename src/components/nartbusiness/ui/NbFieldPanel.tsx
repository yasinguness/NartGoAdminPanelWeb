/**
 * Alan listesi paneli — detay sekmelerinin içindeki "etiket → değer" kartı.
 *
 * Değerin **tonu** bilgi taşır, süs değil:
 *
 * - `miss`  → alan boş ve boş olmaması gerekiyor (kırmızı). Eksik alan
 *             "girilmedi" diye gri yazıldığında hiç okunmuyordu.
 * - `warn`  → dolu ama dikkat ister (yaklaşan son tarih, bekleyen ödeme).
 * - `muted` → açıklama niteliğinde, taranırken atlanabilir.
 * - `link`  → gidilebilir bir yer.
 *
 * Kart başlığında rozet varsa o bölümün özeti orada durur ("1 EKSİK"), böylece
 * kart kapalı ya da ekranın altında kalsa da bilgi kaybolmaz.
 */

import type { ReactNode } from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';
import { nb, nbRadius } from '../../../theme/nbBrand';
import { nbDividerLine, nbPill } from './nbStyles';
import type { NbTone } from './nbStyles';

export type NbFieldTone = 'plain' | 'miss' | 'warn' | 'muted' | 'link';

const FIELD_COLOR: Record<NbFieldTone, string> = {
    plain: '#26313a',
    miss: nb.red,
    warn: nb.amber,
    muted: nb.textFaint,
    link: nb.green,
};

export interface NbField {
    label: string;
    value: ReactNode;
    tone?: NbFieldTone;
    /** Satırın sonundaki tek aksiyon — "iste →", "düzelt" gibi. */
    action?: ReactNode;
}

interface NbFieldPanelProps {
    title: string;
    /** Başlığın sağındaki gri açıklama — kapsam ya da aralık. */
    hint?: string;
    /** Başlığın yanındaki özet rozeti. */
    badge?: string;
    badgeTone?: NbTone;
    fields: NbField[];
    /** Panelin altına giren serbest içerik. */
    children?: ReactNode;
}

export default function NbFieldPanel({
    title, hint, badge, badgeTone = 'warn', fields, children,
}: NbFieldPanelProps) {
    return (
        <Paper
            elevation={0}
            sx={{
                bgcolor: nb.surface,
                border: `1px solid ${nb.border}`,
                borderRadius: `${nbRadius.card}px`,
                overflow: 'hidden',
            }}
        >
            <Stack
                direction="row"
                alignItems="center"
                sx={{ gap: 1.25, px: 2.25, py: 1.625, borderBottom: nbDividerLine }}
            >
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: nb.text }}>{title}</Typography>
                {badge && <Box component="span" sx={nbPill(badgeTone)}>{badge}</Box>}
                {hint && (
                    <Typography sx={{ fontSize: 11.5, color: nb.textFaint, ml: 'auto' }} noWrap>
                        {hint}
                    </Typography>
                )}
            </Stack>

            <Box sx={{ px: 2.25, pt: 0.75, pb: 1.75 }}>
                {fields.map((f, i) => (
                    <Stack
                        key={`${f.label}-${i}`}
                        direction="row"
                        alignItems="baseline"
                        sx={{
                            gap: 1.75,
                            py: 1.125,
                            // Son satırın altındaki çizgi kartın kendi kenarlığıyla
                            // çakışıp çift çizgi yapıyordu.
                            borderBottom: i === fields.length - 1 ? 'none' : '1px solid #f4f2ec',
                        }}
                    >
                        <Typography sx={{ flex: '0 0 168px', fontSize: 11.5, color: nb.textFaint }}>
                            {f.label}
                        </Typography>
                        <Typography
                            sx={{ fontSize: 12.5, color: FIELD_COLOR[f.tone ?? 'plain'], fontWeight: f.tone === 'warn' ? 500 : 400, minWidth: 0 }}
                        >
                            {f.value}
                        </Typography>
                        {f.action && <Box sx={{ ml: 'auto', flexShrink: 0 }}>{f.action}</Box>}
                    </Stack>
                ))}
                {children}
            </Box>
        </Paper>
    );
}
