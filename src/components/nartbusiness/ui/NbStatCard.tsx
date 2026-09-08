/**
 * NB istatistik kutucuğu.
 *
 * Tek bir güncel değer için doğru form grafik değil, stat tile'dır. Rakam
 * mürekkep rengindedir; kimliği yanındaki renkli nokta taşır — böylece renk
 * tek başına hiçbir bilgi taşımaz ve renk körlüğünde de okunur.
 */

import type { ReactNode } from 'react';
import { Box, ButtonBase, Paper, Stack, Typography } from '@mui/material';
import { ArrowForward as ArrowIcon } from '@mui/icons-material';
import { nb } from '../../../theme/nbBrand';
import { NB_STATUS } from './nbViz';

export type NbStatTone = 'neutral' | 'good' | 'warning' | 'serious';

const TONE_COLOR: Record<NbStatTone, string> = {
    neutral: nb.navy,
    good: NB_STATUS.good,
    warning: NB_STATUS.warning,
    serious: NB_STATUS.serious,
};

interface NbStatCardProps {
    label: string;
    value: ReactNode;
    /** Rakamın altındaki bağlam — "son 30 günde +12" gibi. */
    caption?: string;
    tone?: NbStatTone;
    icon?: ReactNode;
    /** Tıklanabilirse nereye gittiğini söyleyen metin. */
    linkText?: string;
    onClick?: () => void;
    /** Dikkat çekmesi gereken bekleyen iş varsa kenarlığı vurgular. */
    emphasize?: boolean;
}

export default function NbStatCard({
    label, value, caption, tone = 'neutral', icon, linkText, onClick, emphasize,
}: NbStatCardProps) {
    const color = TONE_COLOR[tone];

    const content = (
        <Stack spacing={1.25} sx={{ p: 2.25, height: '100%', width: '100%' }}>
            <Stack direction="row" alignItems="center" spacing={1}>
                {icon ? (
                    <Box sx={{ display: 'flex', color, '& svg': { fontSize: 17 } }}>{icon}</Box>
                ) : (
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
                )}
                <Typography
                    sx={{ fontSize: 11.5, fontWeight: 600, color: 'text.secondary', letterSpacing: 0.2 }}
                    noWrap
                >
                    {label}
                </Typography>
            </Stack>

            <Typography
                sx={{
                    fontSize: 30,
                    fontWeight: 700,
                    lineHeight: 1,
                    color: 'text.primary',
                    fontVariantNumeric: 'tabular-nums',
                }}
            >
                {value}
            </Typography>

            <Box sx={{ flex: 1 }} />

            {caption && (
                <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>{caption}</Typography>
            )}
            {linkText && (
                <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: nb.gold }}>
                    <Typography sx={{ fontSize: 11.5, fontWeight: 600 }}>{linkText}</Typography>
                    <ArrowIcon sx={{ fontSize: 13 }} />
                </Stack>
            )}
        </Stack>
    );

    return (
        <Paper
            elevation={0}
            sx={{
                height: '100%',
                borderRadius: 2.5,
                border: '1px solid',
                borderColor: emphasize ? `${color}55` : 'rgba(27,42,74,0.09)',
                bgcolor: emphasize ? `${color}0A` : 'background.paper',
                overflow: 'hidden',
                transition: 'border-color 0.15s, box-shadow 0.15s',
                ...(onClick && {
                    '&:hover': { borderColor: `${color}77`, boxShadow: '0 4px 16px -8px rgba(27,42,74,0.35)' },
                }),
            }}
        >
            {onClick ? (
                <ButtonBase
                    onClick={onClick}
                    sx={{ height: '100%', width: '100%', textAlign: 'left', alignItems: 'stretch', justifyContent: 'flex-start' }}
                >
                    {content}
                </ButtonBase>
            ) : (
                content
            )}
        </Paper>
    );
}
