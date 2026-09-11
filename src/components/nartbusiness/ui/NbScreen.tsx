/**
 * NB sayfa kabuğu — her NartBusiness ekranının aynı açılışı.
 *
 * Ekranlar birbirine benzemiyordu: kimi doğrudan tabloyla başlıyor, kimi
 * dört kutucukla, kimi başlığın sağına altı buton diziyordu. Kullanıcı her
 * sayfada "burada ne yapabilirim" sorusunu yeniden çözmek zorunda kalıyordu.
 *
 * Sabit ritim: nerede olduğun (breadcrumb) → ne olduğu (başlık) → ne işe
 * yaradığı (tek cümle) → ne yapabileceğin (bir birincil, bir ikincil) →
 * nasıl gittiği (dört ölçü).
 *
 * Aksiyon sayısı bilinçli olarak ikiyle sınırlı. Üçüncü bir buton eklemek
 * isteyen ekran onu içerik alanına, ait olduğu kutunun içine koymalı;
 * başlıktaki iki yer "bu sayfada en çok yapılan iki şey" için ayrılmıştır.
 */

import type { ReactNode } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { nb, nbRadius } from '../../../theme/nbBrand';
import { nbCrumb, nbLabel, nbPageTitle, nbPrimaryBtn, nbSecondaryBtn } from './nbStyles';

/** Başlık şeridindeki tek aksiyon. */
export interface NbAction {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    /** Yükleniyor/işleniyor sırasında butonun aldığı metin. */
    busyLabel?: string;
    busy?: boolean;
}

/** KPI kutusu — bir ölçü, bir bağlam satırı. */
export interface NbKpi {
    label: string;
    value: ReactNode;
    /** Rakamın yanındaki tek kelimelik bağlam: "+38 bu ay", "ortalama 2 gün". */
    hint?: string;
    /** Rakamın rengi. Varsayılan mürekkep; renk yalnız anlam taşıyorsa. */
    tone?: 'ink' | 'good' | 'warn' | 'bad';
    /** Verilirse kutu tıklanabilir olur ve kendi alt kümesini açar. */
    onClick?: () => void;
    /** Bu kutunun temsil ettiği süzgeç şu an açık mı. */
    active?: boolean;
}

const TONE_COLOR = {
    ink: nb.text,
    good: nb.green,
    warn: nb.amber,
    bad: nb.red,
} as const;

interface NbScreenProps {
    /** "NARTBUSINESS · ÜYELİK" — nerede olduğun. */
    crumb: string;
    title: string;
    /** Sayfanın ne işe yaradığını söyleyen TEK cümle. */
    purpose: string;
    primary?: NbAction;
    secondary?: NbAction;
    /** Dört ölçü. Daha azı olur, daha fazlası şeridi okunmaz yapar. */
    kpis?: NbKpi[];
    children: ReactNode;
}

export default function NbScreen({
    crumb, title, purpose, primary, secondary, kpis, children,
}: NbScreenProps) {
    return (
        // Kabuk sayfa dolgusunu kendi yönetir: başlık şeridi kenardan kenara
        // uzanır, içerik alanı kendi dolgusunu alır.
        <Box sx={{ mx: { xs: -2, sm: -3 }, my: -3, bgcolor: nb.bg, minHeight: 'calc(100vh - 64px)' }}>
            <Box
                component="header"
                sx={{
                    bgcolor: nb.surface,
                    borderBottom: `1px solid ${nb.border}`,
                    px: { xs: 2, sm: 3.25 },
                    pt: 2.25,
                    pb: 2,
                }}
            >
                <Typography sx={nbCrumb}>{crumb}</Typography>

                <Stack
                    direction="row"
                    flexWrap="wrap"
                    useFlexGap
                    spacing={2.25}
                    alignItems="flex-end"
                    justifyContent="space-between"
                    sx={{ mt: 0.5 }}
                >
                    <Box sx={{ minWidth: 0 }}>
                        <Typography component="h1" sx={nbPageTitle}>
                            {title}
                        </Typography>
                        <Typography sx={{ fontSize: 13, color: nb.textMuted, maxWidth: '70ch', mt: 0.5 }}>
                            {purpose}
                        </Typography>
                    </Box>

                    {(primary || secondary) && (
                        <Stack direction="row" spacing={1} flexShrink={0}>
                            {secondary && <ActionButton action={secondary} variant="secondary" />}
                            {primary && <ActionButton action={primary} variant="primary" />}
                        </Stack>
                    )}
                </Stack>

                {kpis && kpis.length > 0 && (
                    <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1.25} sx={{ mt: 2 }}>
                        {kpis.map((k) => (
                            <KpiBox key={k.label} kpi={k} />
                        ))}
                    </Stack>
                )}
            </Box>

            <Box sx={{ px: { xs: 2, sm: 3.25 }, pt: 2, pb: 3.75 }}>{children}</Box>
        </Box>
    );
}

function ActionButton({ action, variant }: { action: NbAction; variant: 'primary' | 'secondary' }) {
    return (
        <Button
            disableElevation
            onClick={action.onClick}
            disabled={action.disabled || action.busy}
            sx={variant === 'primary' ? nbPrimaryBtn : nbSecondaryBtn}
        >
            {action.busy && action.busyLabel ? action.busyLabel : action.label}
        </Button>
    );
}

function KpiBox({ kpi }: { kpi: NbKpi }) {
    const clickable = !!kpi.onClick;
    return (
        <Box
            onClick={kpi.onClick}
            role={clickable ? 'button' : undefined}
            tabIndex={clickable ? 0 : undefined}
            onKeyDown={
                clickable
                    ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              kpi.onClick?.();
                          }
                      }
                    : undefined
            }
            sx={{
                bgcolor: kpi.active ? '#f2f6f4' : nb.bg,
                border: `1px solid ${kpi.active ? nb.green : nb.border}`,
                borderRadius: `${nbRadius.panel}px`,
                px: 1.75,
                py: 1.125,
                minWidth: 132,
                cursor: clickable ? 'pointer' : 'default',
                ...(clickable && { '&:hover': { borderColor: nb.textFaint } }),
            }}
        >
            <Typography sx={nbLabel}>{kpi.label}</Typography>
            <Stack direction="row" alignItems="baseline" spacing={0.75} sx={{ mt: 0.375 }}>
                <Typography
                    sx={{
                        fontSize: 21,
                        fontWeight: 600,
                        lineHeight: 1.15,
                        color: TONE_COLOR[kpi.tone ?? 'ink'],
                        fontVariantNumeric: 'tabular-nums',
                    }}
                >
                    {kpi.value}
                </Typography>
                {kpi.hint && (
                    <Typography sx={{ fontSize: 11.5, color: '#7b858c' }}>{kpi.hint}</Typography>
                )}
            </Stack>
        </Box>
    );
}
