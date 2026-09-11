/**
 * NB sayfa başlığı — her NB ekranının aynı açılışı.
 *
 * Kalıp tek ve sabit:
 *
 *     breadcrumb → serif başlık → tek cümle amaç → sağda 1 birincil + 1 ikincil
 *     → (varsa) KPI şeridi
 *
 * Başlık şeridi kendi kart zeminine oturur ve alttan 1px çizgiyle biter;
 * sayfanın "kontrol" kısmı ile "sonuç" kısmı arasındaki sınır budur. Şerit
 * sayfa dolgusunun dışına taşar (negatif margin) çünkü kenardan kenara
 * uzanan bir başlık, içerikle aynı hizada duran bir kutudan daha okunur bir
 * sayfa üstü kurar.
 *
 * Başlık boyutu iki kademe: liste sayfasında 34px, detay sayfasında 27px.
 * Detayda başlığın yanında durum rozeti ve kademe durur, 34px o satırı
 * taşırıyordu.
 */

import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { nb, nbType } from '../../../theme/nbBrand';

interface NbPageHeaderProps {
    title: string;
    /** Başlığın altındaki tek cümle — bu sayfa ne işe yarar. */
    subtitle?: string;
    /**
     * Başlığın üstündeki bağlam yolu, örn. "NartBusiness · Üyelik".
     * `eyebrow` eski adı; ikisi de aynı yere basar.
     */
    crumb?: string;
    /** @deprecated `crumb` kullan. Geriye dönük uyum için duruyor. */
    eyebrow?: string;
    /** Sağ üst: en fazla bir birincil + bir ikincil aksiyon. */
    actions?: ReactNode;
    /** Başlığın yanına giren rozetler (detay sayfasında durum, kademe). */
    adornment?: ReactNode;
    /**
     * Detay sayfasında başlığın solundaki baş harf kutusu.
     *
     * Fotoğraf değil harf: üyelerin çoğunda logo yok ve boş bir avatar
     * çemberi, dolu olanın yanında eksiklik gibi duruyordu. Harf her zaman
     * dolu ve şirketi listede gördüğü kutuyla aynı işaretle eşliyor.
     */
    avatarInitial?: string;
    /** Başlık şeridinin altına giren KPI kutuları. */
    kpis?: ReactNode;
    /** Şeridin en altına giren sekmeler — detay sayfası için. */
    tabs?: ReactNode;
    /** Detay sayfası: 27px başlık ve sticky şerit. */
    variant?: 'list' | 'detail';
}

export default function NbPageHeader({
    title, subtitle, crumb, eyebrow, actions, adornment, avatarInitial, kpis, tabs, variant = 'list',
}: NbPageHeaderProps) {
    const detail = variant === 'detail';
    const path = crumb ?? eyebrow;

    return (
        <Box
            component="header"
            sx={{
                bgcolor: nb.surface,
                borderBottom: `1px solid ${nb.border}`,
                // Şerit sayfa dolgusunu iptal edip kenardan kenara uzanır.
                mx: { xs: -2, md: -3.25 },
                mt: { xs: -2, md: -3.25 },
                px: { xs: 2, md: 3.25 },
                pt: detail ? 1.75 : 2.25,
                pb: tabs ? 0 : 2,
                mb: 2,
                ...(detail && { position: 'sticky', top: 0, zIndex: 20 }),
            }}
        >
            {path && (
                <Typography sx={{ ...nbType.crumb, color: nb.textFaint }}>{path}</Typography>
            )}

            <Stack
                direction="row"
                flexWrap="wrap"
                alignItems="flex-end"
                justifyContent="space-between"
                sx={{ gap: 2.25, mt: 0.5 }}
            >
                <Stack direction="row" alignItems="center" sx={{ gap: 2, minWidth: 0 }}>
                    {avatarInitial && (
                        <Box
                            sx={{
                                width: 44, height: 44, borderRadius: '11px', flexShrink: 0,
                                display: 'grid', placeItems: 'center',
                                bgcolor: nb.navy, color: nb.gold, fontWeight: 700, fontSize: 15,
                            }}
                        >
                            {avatarInitial}
                        </Box>
                    )}
                    <Box sx={{ minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" flexWrap="wrap" sx={{ gap: 1.125 }}>
                        <Typography
                            component="h1"
                            sx={{
                                ...nbType.pageTitle,
                                fontSize: detail ? 27 : 34,
                                color: nb.text,
                            }}
                        >
                            {title}
                        </Typography>
                        {adornment}
                    </Stack>
                    {subtitle && (
                        <Typography sx={{ mt: 0.5, fontSize: 13, color: nb.textMuted, maxWidth: '70ch' }}>
                            {subtitle}
                        </Typography>
                    )}
                    </Box>
                </Stack>

                {actions && (
                    <Stack direction="row" flexWrap="wrap" sx={{ gap: 1, flexShrink: 0 }}>
                        {actions}
                    </Stack>
                )}
            </Stack>

            {kpis && (
                <Stack direction="row" flexWrap="wrap" sx={{ gap: 1.25, mt: 2 }}>
                    {kpis}
                </Stack>
            )}

            {tabs && <Stack direction="row" sx={{ gap: '2px', mt: 1.75 }}>{tabs}</Stack>}
        </Box>
    );
}
