/**
 * Ölçer — tek bir oranın sınırına göre durumu.
 *
 * "Kazanma oranı %38" iki dilimli pasta değildir; aynı ramp üzerinde bir
 * doluluk çubuğudur. Yüzde metni her zaman görünür, renk destekleyicidir.
 */

import { Box, Stack, Typography } from '@mui/material';
import { NB_STATUS } from './nbViz';

interface NbMeterProps {
    label: string;
    /** 0–100 arası. */
    pct: number;
    /** Rakamın altındaki açıklama. */
    caption?: string;
    /** Bu eşiğin altı "kötü", üstü "iyi" sayılır. */
    goodAbove?: number;
}

export default function NbMeter({ label, pct, caption, goodAbove = 50 }: NbMeterProps) {
    const clamped = Math.max(0, Math.min(100, Math.round(pct)));
    const color = clamped >= goodAbove ? NB_STATUS.good : clamped >= goodAbove / 2 ? NB_STATUS.warning : NB_STATUS.serious;

    return (
        <Stack spacing={1}>
            <Stack direction="row" alignItems="baseline" spacing={1}>
                <Typography sx={{ fontSize: 12.5, color: 'text.secondary', flex: 1 }}>{label}</Typography>
                <Typography
                    sx={{
                        fontSize: 22, fontWeight: 700, color: 'text.primary', lineHeight: 1,
                        fontVariantNumeric: 'tabular-nums',
                    }}
                >
                    %{clamped}
                </Typography>
            </Stack>
            <Box sx={{ height: 8, borderRadius: 4, bgcolor: 'rgba(27,42,74,0.06)', overflow: 'hidden' }}>
                <Box
                    sx={{
                        width: `${clamped}%`, height: '100%', borderRadius: 4,
                        bgcolor: color, transition: 'width 0.35s ease',
                    }}
                />
            </Box>
            {caption && (
                <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>{caption}</Typography>
            )}
        </Stack>
    );
}
