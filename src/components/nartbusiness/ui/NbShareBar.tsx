/**
 * Parça-bütün çubuğu — tek yatay yığılmış bar + sayı listesi.
 *
 * Neden pasta değil: beş dilimli pasta, açı karşılaştırması gerektirdiği için
 * okunması en zor formlardan biri. Tek bir yatay çubuk aynı bilgiyi uzunlukla
 * verir ve uzun Türkçe kategori adları için yer bırakır.
 *
 * Segmentler arasında 2px yüzey boşluğu var: bitişik dolgular renk körlüğünde
 * birbirine akmasın diye. Kategorik palet 3:1 kontrastın altında slotlar
 * içerdiği için altındaki sayı listesi zorunludur (relief kuralı) — renk hiçbir
 * zaman tek başına taşıyıcı değil.
 */

import { Box, Stack, Tooltip, Typography } from '@mui/material';
import { NB_CATEGORICAL, nbNumber, nbPct } from './nbViz';
import NbEmptyState from './NbEmptyState';

export interface NbShareSlice {
    key: string;
    label: string;
    value: number;
}

interface NbShareBarProps {
    slices: NbShareSlice[];
    /** Boş olduğunda gösterilecek metin. */
    emptyText?: string;
}

export default function NbShareBar({ slices, emptyText = 'Henüz kayıt yok.' }: NbShareBarProps) {
    const visible = slices.filter((s) => s.value > 0);
    const total = visible.reduce((acc, s) => acc + s.value, 0);

    if (total === 0) {
        return <NbEmptyState title={emptyText} dense />;
    }

    // Renk kimliğe göre sabit: dizideki sıra korunur, filtrelenen slotlar
    // hayatta kalanları yeniden boyamaz.
    const colorOf = (key: string) => {
        const idx = slices.findIndex((s) => s.key === key);
        return NB_CATEGORICAL[idx % NB_CATEGORICAL.length];
    };

    return (
        <Stack spacing={2}>
            <Box sx={{ display: 'flex', width: '100%', height: 34, gap: '2px' }}>
                {visible.map((s) => {
                    const pct = nbPct(s.value, total);
                    return (
                        <Tooltip
                            key={s.key}
                            title={`${s.label}: ${nbNumber(s.value)} · %${pct}`}
                            arrow
                        >
                            <Box
                                sx={{
                                    flexGrow: s.value,
                                    flexBasis: 0,
                                    minWidth: 3,
                                    bgcolor: colorOf(s.key),
                                    borderRadius: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'default',
                                    transition: 'filter 0.15s',
                                    '&:hover': { filter: 'brightness(1.08)' },
                                }}
                            >
                                {/* Doğrudan etiket yalnız sığdığında — her dilime
                                    sayı basmak gürültü olurdu. */}
                                {pct >= 12 && (
                                    <Typography
                                        sx={{
                                            fontSize: 11,
                                            fontWeight: 700,
                                            color: '#fff',
                                            textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                                        }}
                                    >
                                        %{pct}
                                    </Typography>
                                )}
                            </Box>
                        </Tooltip>
                    );
                })}
            </Box>

            {/* Sayı listesi = tablo görünümü. Kontrast WARN'ının gerektirdiği
                relief burada karşılanıyor. */}
            <Stack spacing={0.75}>
                {slices.map((s) => (
                    <Stack key={s.key} direction="row" alignItems="center" spacing={1.25}>
                        <Box
                            sx={{
                                width: 9, height: 9, borderRadius: '2px', flexShrink: 0,
                                bgcolor: colorOf(s.key),
                                opacity: s.value > 0 ? 1 : 0.28,
                            }}
                        />
                        <Typography sx={{ fontSize: 12.5, color: 'text.secondary', flex: 1 }} noWrap>
                            {s.label}
                        </Typography>
                        <Typography
                            sx={{
                                fontSize: 12.5, fontWeight: 700, color: 'text.primary',
                                fontVariantNumeric: 'tabular-nums',
                            }}
                        >
                            {nbNumber(s.value)}
                        </Typography>
                        <Typography
                            sx={{
                                fontSize: 11.5, color: 'text.secondary', width: 38, textAlign: 'right',
                                fontVariantNumeric: 'tabular-nums',
                            }}
                        >
                            %{nbPct(s.value, total)}
                        </Typography>
                    </Stack>
                ))}
            </Stack>
        </Stack>
    );
}
