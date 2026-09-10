/**
 * Sayfa başlığı bloğu — yalnız metin, yerleşim yok.
 *
 * NbPageHeader kendi Stack'ini ve aksiyon alanını da kurar. Bazı sayfaların
 * zaten kendi başlık satırı düzeni var; oralara tüm yerleşimi dayatmak yerine
 * sadece tipografiyi ortaklaştırmak gerekiyor. Bu bileşen o durum için.
 */

import { Box, Typography } from '@mui/material';
import { nb } from '../../../theme/nbBrand';

interface NbTitleBlockProps {
    title: string;
    subtitle?: string;
    eyebrow?: string;
}

export default function NbTitleBlock({ title, subtitle, eyebrow = 'NartBusiness' }: NbTitleBlockProps) {
    return (
        <Box sx={{ minWidth: 0 }}>
            {eyebrow && (
                <Typography
                    sx={{ fontSize: 10, letterSpacing: 1.6, fontWeight: 700, color: nb.gold, mb: 0.5 }}
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
    );
}
