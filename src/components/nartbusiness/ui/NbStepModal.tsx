/**
 * NB adımlı diyalog kabuğu — sihirbaz ve durum değiştirme modalı bunu paylaşır.
 *
 * İki başlık biçimi var, çünkü iki farklı iş yapıyorlar:
 *
 * - `tone="dark"` → koyu başlık şeridi. Yeni bir kayıt yaratan uzun akış
 *   (üye oluşturma). Koyu şerit "bu ayrı bir iş, sayfadan çıktın" der.
 * - `tone="light"` → beyaz başlık + altın altı çizili adım göstergesi.
 *   Mevcut bir kaydı değiştiren kısa akış (üyelik durumu). Sayfanın
 *   devamıymış gibi durması doğru, çünkü öyle.
 *
 * Alt şerit her iki biçimde aynı: solda geri dönüş ("Vazgeç"), sağda
 * Geri + birincil. Vazgeç'in solda ve dolgusuz olması bilinçli — yanlışlıkla
 * basılması en muhtemel olan buton, en az çeken buton olmalı.
 */

import type { ReactNode } from 'react';
import { Box, Button, Dialog, Stack, Typography } from '@mui/material';
import { nb, nbRadius, nbType } from '../../../theme/nbBrand';
import { nbDividerLine } from './nbStyles';

export interface NbStep {
    label: string;
    /** Adım başlığının altındaki tek satırlık kural. */
    hint?: string;
}

interface NbStepModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    /** Başlığın yanındaki bağlam — "ÜYELİK PROTOKOLÜ" ya da üyenin adı. */
    caption?: string;
    steps: NbStep[];
    current: number;
    tone?: 'dark' | 'light';
    width?: number;
    children: ReactNode;
    /** Sağdaki koyu bilgi paneli — o adımın kuralını anlatır. */
    aside?: ReactNode;
    /** Alt şeritte "Vazgeç"in yanındaki sessiz not. */
    footNote?: string;
    primaryLabel: string;
    onPrimary: () => void;
    /** Birincil buton kapalıysa sebebi çağıran tarafta kalır (onay kutusu vb.). */
    primaryDisabled?: boolean;
    /** Geri alınamaz adımda birincil buton kırmızıya döner. */
    primaryDanger?: boolean;
    onBack?: () => void;
    busy?: boolean;
}

export default function NbStepModal({
    open, onClose, title, caption, steps, current, tone = 'dark', width = 940,
    children, aside, footNote, primaryLabel, onPrimary, primaryDisabled, primaryDanger,
    onBack, busy,
}: NbStepModalProps) {
    const dark = tone === 'dark';

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth={false}
            PaperProps={{
                sx: {
                    width: `min(${width}px, 100%)`,
                    bgcolor: nb.surface,
                    borderRadius: '14px',
                    boxShadow: '0 30px 70px rgba(14,27,38,.35)',
                    overflow: 'hidden',
                    m: 2.5,
                },
            }}
        >
            {dark ? (
                <>
                    <Stack
                        direction="row"
                        alignItems="center"
                        sx={{ gap: 1.75, px: 2.5, py: 1.75, bgcolor: nb.navy, color: nb.onDark }}
                    >
                        <Typography sx={{ fontFamily: nbType.serif, fontSize: 19 }}>{title}</Typography>
                        {caption && (
                            <Typography sx={{ ...nbType.label, color: nb.onDarkMuted, letterSpacing: '0.14em' }}>
                                {caption}
                            </Typography>
                        )}
                        <Typography sx={{ ml: 'auto', fontSize: 11, color: nb.onDarkMuted, letterSpacing: '0.1em' }}>
                            ADIM {current + 1} / {steps.length}
                        </Typography>
                    </Stack>

                    {/* Numaralı adım şeridi: hangi adımdasın ve kaç adım kaldı. */}
                    <Stack
                        direction="row"
                        sx={{ px: 2.5, py: 1.5, bgcolor: nb.inputBg, borderBottom: nbDividerLine }}
                    >
                        {steps.map((s, i) => (
                            <Stack
                                key={s.label}
                                direction="row"
                                alignItems="center"
                                sx={{ flex: 1, gap: 1.125, minWidth: 0, opacity: i <= current ? 1 : 0.5 }}
                            >
                                <Box
                                    sx={{
                                        width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                                        display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700,
                                        bgcolor: i <= current ? nb.gold : '#e2ded3',
                                        color: i <= current ? nb.navy : nb.textFaint,
                                    }}
                                >
                                    {i + 1}
                                </Box>
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography sx={{ fontSize: 12, fontWeight: 600 }} noWrap>{s.label}</Typography>
                                    {s.hint && (
                                        <Typography sx={{ fontSize: 10.5, color: nb.textFaint }} noWrap>
                                            {s.hint}
                                        </Typography>
                                    )}
                                </Box>
                            </Stack>
                        ))}
                    </Stack>
                </>
            ) : (
                <Box sx={{ px: 2.75, pt: 2.25, pb: 1.75, borderBottom: nbDividerLine }}>
                    <Typography sx={{ fontSize: 16, fontWeight: 600, color: nb.text }}>{title}</Typography>
                    {caption && (
                        <Typography sx={{ fontSize: 12, color: nb.textMuted, mt: 0.375 }}>{caption}</Typography>
                    )}
                    <Stack direction="row" sx={{ gap: 0.75, mt: 1.625 }}>
                        {steps.map((s, i) => (
                            <Box
                                key={s.label}
                                sx={{
                                    flex: 1,
                                    textAlign: 'center',
                                    fontSize: 11.5,
                                    fontWeight: i === current ? 600 : 400,
                                    color: i <= current ? nb.text : nb.textFaint,
                                    borderBottom: `2px solid ${i <= current ? nb.gold : nb.border}`,
                                    pb: 0.875,
                                }}
                            >
                                {i + 1}. {s.label}
                            </Box>
                        ))}
                    </Stack>
                </Box>
            )}

            <Stack direction="row" flexWrap="wrap">
                <Box sx={{ flex: aside ? '2 1 420px' : '1 1 100%', minWidth: 0, px: 2.75, py: 2.5 }}>
                    {children}
                </Box>
                {aside && (
                    <Box sx={{ flex: '1 1 260px', minWidth: 0, bgcolor: nb.navy, color: '#cfd8de', p: 2.5 }}>
                        {aside}
                    </Box>
                )}
            </Stack>

            <Stack
                direction="row"
                alignItems="center"
                sx={{ gap: 1.25, px: 2.75, py: 1.75, borderTop: nbDividerLine }}
            >
                <Button
                    onClick={onClose}
                    sx={{ color: nb.textMuted, fontSize: 13, textTransform: 'none', px: 0, minWidth: 0 }}
                >
                    Vazgeç
                </Button>
                {footNote && <Typography sx={{ fontSize: 11.5, color: nb.textFaint }}>{footNote}</Typography>}

                <Stack direction="row" sx={{ gap: 1.125, ml: 'auto' }}>
                    {onBack && (
                        <Button
                            disableElevation
                            onClick={onBack}
                            sx={{
                                border: `1px solid ${nb.inputBorder}`, bgcolor: '#fff', color: nb.textMuted,
                                borderRadius: `${nbRadius.control}px`, px: 2, py: 1.25, fontSize: 13,
                                textTransform: 'none',
                                // Görünürlük kapatılır, yer korunur: buton gelip gittikçe
                                // birincil aksiyon sağa sola kaymasın.
                                visibility: current === 0 ? 'hidden' : 'visible',
                                '&:hover': { bgcolor: nb.inputBg },
                            }}
                        >
                            Geri
                        </Button>
                    )}
                    <Button
                        disableElevation
                        disabled={primaryDisabled || busy}
                        onClick={onPrimary}
                        sx={{
                            border: 'none',
                            bgcolor: primaryDanger ? nb.red : nb.navy,
                            color: '#fff',
                            borderRadius: `${nbRadius.control}px`,
                            px: 2.5, py: 1.25, fontSize: 13, fontWeight: 600, textTransform: 'none',
                            '&:hover': { bgcolor: primaryDanger ? '#96322f' : nb.navyDeep },
                            '&.Mui-disabled': { bgcolor: '#e2ded3', color: nb.textFaint },
                        }}
                    >
                        {primaryLabel}
                    </Button>
                </Stack>
            </Stack>
        </Dialog>
    );
}
