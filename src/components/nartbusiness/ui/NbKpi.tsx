/**
 * NB KPI kutusu — başlık şeridindeki dört sayıdan biri.
 *
 * İki kural bu bileşeni belirliyor:
 *
 * 1. **Kutu tıklanabilir ve gerçekten filtre uygular.** "Aksiyon bekleyen: 5"
 *    yazıp o beşi göstermeyen bir kutu dekorasyondur; sayıyı okuyan kişinin
 *    bir sonraki isteği zaten "onları göster". `onClick` verilmezse kutu düz
 *    metin olur ve imleç değişmez — tıklanabilir görünüp tıklanmayan bir şey
 *    bırakmayız.
 * 2. **Rakamın rengi anlam taşır, süs değil.** Varsayılan mürekkep rengi;
 *    kırmızı yalnız gerçekten bekleyen iş varken, amber para riski için.
 *    Sıfır değerinde ton nötre düşer: "0 aksiyon bekliyor" kırmızı olmamalı.
 *
 * Rakam 21px: şeritteki dört kutu yan yana durduğu için daha büyüğü başlığın
 * kendisiyle yarışıyordu.
 */

import type { ReactNode } from 'react';
import { Box, ButtonBase, Stack, Typography } from '@mui/material';
import { nb, nbRadius, nbType } from '../../../theme/nbBrand';

export type NbKpiTone = 'neutral' | 'good' | 'warn' | 'bad';

const TONE: Record<NbKpiTone, string> = {
    neutral: nb.text,
    good: nb.green,
    warn: nb.amber,
    bad: nb.red,
};

interface NbKpiProps {
    label: string;
    value: ReactNode;
    /** Rakamın yanındaki bağlam — "3 gecikmiş ödeme", "+38 bu ay". */
    hint?: string;
    tone?: NbKpiTone;
    /** Kutunun açtığı filtre uygulanmış durumdaysa kenarlık vurgulanır. */
    active?: boolean;
    /** Verilirse kutu bir düğme olur ve ilgili filtreyi uygular. */
    onClick?: () => void;
}

export default function NbKpi({ label, value, hint, tone = 'neutral', active, onClick }: NbKpiProps) {
    // Sıfırda uyarı rengi taşımaz: bekleyen iş yokken kırmızı bir "0" yanlış alarmdır.
    const muted = value === 0 || value === '0';
    const color = TONE[muted ? 'neutral' : tone];

    const body = (
        <Stack sx={{ px: 1.75, py: 1.125, width: '100%', alignItems: 'flex-start' }}>
            <Typography sx={{ ...nbType.label, color: nb.textFaint }}>{label}</Typography>
            <Stack direction="row" alignItems="baseline" sx={{ gap: 0.875, mt: 0.375 }}>
                <Typography
                    sx={{ fontSize: 21, fontWeight: 600, lineHeight: 1.15, color, fontVariantNumeric: 'tabular-nums' }}
                >
                    {value}
                </Typography>
                {hint && <Typography sx={{ fontSize: 11.5, color: '#7b858c' }}>{hint}</Typography>}
            </Stack>
        </Stack>
    );

    const frame = {
        bgcolor: nb.bg,
        border: `1px solid ${active ? nb.navy : nb.border}`,
        borderRadius: `${nbRadius.panel}px`,
        minWidth: 150,
        textAlign: 'left' as const,
    };

    if (!onClick) return <Box sx={frame}>{body}</Box>;

    return (
        <ButtonBase
            onClick={onClick}
            sx={{
                ...frame,
                justifyContent: 'flex-start',
                '&:hover': { bgcolor: '#efeee8', borderColor: nb.textFaint },
            }}
        >
            {body}
        </ButtonBase>
    );
}
