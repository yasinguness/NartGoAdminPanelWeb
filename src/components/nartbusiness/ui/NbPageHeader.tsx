/**
 * NB sayfa başlığı — her NB sayfasının aynı açılışı.
 *
 * Sayfalar arasında başlık bazen h4, bazen h5, bazen düz Typography'ydi;
 * açıklama bazen vardı bazen yoktu. Tek bileşen, tek ritim.
 */

import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { nb } from '../../../theme/nbBrand';

interface NbPageHeaderProps {
    title: string;
    /** Başlığın altındaki tek satırlık açıklama — sayfanın ne işe yaradığı. */
    subtitle?: string;
    /** Başlığın üstündeki küçük bağlam etiketi. */
    eyebrow?: string;
    /** Sağ taraftaki aksiyonlar (buton, filtre vb.). */
    actions?: ReactNode;
}

export default function NbPageHeader({ title, subtitle, eyebrow, actions }: NbPageHeaderProps) {
    return (
        <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'flex-start', sm: 'flex-end' }}
            justifyContent="space-between"
            spacing={2}
            sx={{ mb: 3 }}
        >
            <Box sx={{ minWidth: 0 }}>
                {eyebrow && (
                    <Typography
                        sx={{
                            fontSize: 10,
                            letterSpacing: 1.6,
                            fontWeight: 700,
                            color: nb.gold,
                            mb: 0.5,
                        }}
                    >
                        {eyebrow.toUpperCase()}
                    </Typography>
                )}
                <Typography
                    component="h1"
                    sx={{
                        fontFamily: 'Georgia, "Times New Roman", serif',
                        fontStyle: 'italic',
                        fontWeight: 700,
                        fontSize: { xs: 24, sm: 30 },
                        lineHeight: 1.15,
                        color: nb.navy,
                    }}
                >
                    {title}
                </Typography>
                {subtitle && (
                    <Typography sx={{ mt: 0.75, fontSize: 14, color: 'text.secondary', maxWidth: 640 }}>
                        {subtitle}
                    </Typography>
                )}
            </Box>
            {actions && (
                <Stack direction="row" spacing={1} alignItems="center" flexShrink={0}>
                    {actions}
                </Stack>
            )}
        </Stack>
    );
}
