/**
 * NB panel — başlıklı içerik kutusu.
 *
 * Grafikler, listeler ve tablolar hep bunun içinde yaşar; böylece kenarlık,
 * köşe ve iç boşluk tek yerden değişir.
 */

import type { ReactNode } from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';
import { nb } from '../../../theme/nbBrand';

interface NbPanelProps {
    title: string;
    /** Başlığın yanındaki gri açıklama — ölçünün ne olduğu, hangi aralık vb. */
    hint?: string;
    icon?: ReactNode;
    /** Sağ üstteki aksiyon (link, buton). */
    action?: ReactNode;
    children: ReactNode;
    /** İçeriğin kendi boşluğu varsa (tablo gibi) iç dolguyu kapat. */
    disableGutters?: boolean;
}

export default function NbPanel({ title, hint, icon, action, children, disableGutters }: NbPanelProps) {
    return (
        <Paper
            elevation={0}
            sx={{
                height: '100%',
                borderRadius: 2.5,
                border: '1px solid',
                borderColor: 'rgba(27,42,74,0.09)',
                bgcolor: 'background.paper',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}
        >
            <Stack
                direction="row"
                alignItems="center"
                spacing={1.25}
                sx={{
                    px: 2.5,
                    py: 1.75,
                    borderBottom: '1px solid',
                    borderColor: 'rgba(27,42,74,0.07)',
                }}
            >
                {icon && (
                    <Box sx={{ display: 'flex', color: nb.gold, '& svg': { fontSize: 18 } }}>{icon}</Box>
                )}
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: nb.navy, flexShrink: 0 }}>
                    {title}
                </Typography>
                {hint && (
                    <Typography sx={{ fontSize: 11.5, color: 'text.secondary', minWidth: 0 }} noWrap>
                        {hint}
                    </Typography>
                )}
                <Box sx={{ flex: 1 }} />
                {action}
            </Stack>
            <Box sx={{ flex: 1, p: disableGutters ? 0 : 2.5 }}>{children}</Box>
        </Paper>
    );
}
