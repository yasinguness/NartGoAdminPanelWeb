/**
 * Boş durum — "veri yok" ile "bir şey bozuldu" aynı şey değil.
 *
 * Eskiden boş listeler sessizce hiçbir şey göstermiyordu; kullanıcı sayfanın
 * yüklenmediğini mi yoksa gerçekten kayıt olmadığını mı bilmiyordu.
 */

import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { NB_INK } from './nbViz';

interface NbEmptyStateProps {
    title: string;
    description?: string;
    icon?: ReactNode;
    action?: ReactNode;
    /** Panel içinde dar alanda kullanılıyorsa dikey boşluğu azaltır. */
    dense?: boolean;
}

export default function NbEmptyState({ title, description, icon, action, dense }: NbEmptyStateProps) {
    return (
        <Stack alignItems="center" spacing={1} sx={{ py: dense ? 3 : 6, px: 2, textAlign: 'center' }}>
            {icon && (
                <Box sx={{ color: NB_INK.muted, opacity: 0.5, '& svg': { fontSize: dense ? 28 : 36 } }}>
                    {icon}
                </Box>
            )}
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'text.primary' }}>{title}</Typography>
            {description && (
                <Typography sx={{ fontSize: 12.5, color: 'text.secondary', maxWidth: 380 }}>
                    {description}
                </Typography>
            )}
            {action && <Box sx={{ pt: 0.5 }}>{action}</Box>}
        </Stack>
    );
}
