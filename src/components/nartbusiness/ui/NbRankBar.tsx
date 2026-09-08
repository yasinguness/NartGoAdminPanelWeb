/**
 * Yatay büyüklük çubuğu — sıralı tek hue.
 *
 * İş "serileri birbirinden ayırmak" değil "büyüklük karşılaştırmak" olduğunda
 * kategorik palet yanlış araçtır: her kategoriye ayrı renk vermek asıl mesajı
 * (hangisi büyük) gömüyor. Burada tek hue, daha çok = daha koyu.
 *
 * Yatay tercih edildi çünkü Türkçe durum adları uzun ("Ödeme bekliyor",
 * "Doğrulama bekliyor"); dikey barda etiketler eğik yazılmak zorunda kalırdı.
 */

import { Box, Stack, Tooltip, Typography } from '@mui/material';
import { NB_SEQUENTIAL, nbNumber, nbPct } from './nbViz';
import NbEmptyState from './NbEmptyState';

export interface NbRankRow {
    key: string;
    label: string;
    value: number;
    /** Satır tıklanabilirse. */
    onClick?: () => void;
}

interface NbRankBarProps {
    rows: NbRankRow[];
    emptyText?: string;
    /** Kıyas tabanı — verilmezse en büyük satır baz alınır. */
    max?: number;
}

export default function NbRankBar({ rows, emptyText = 'Henüz kayıt yok.', max }: NbRankBarProps) {
    const total = rows.reduce((acc, r) => acc + r.value, 0);
    if (total === 0) return <NbEmptyState title={emptyText} dense />;

    const peak = max ?? Math.max(...rows.map((r) => r.value), 1);

    return (
        <Stack spacing={1.5}>
            {rows.map((r) => {
                const ratio = peak > 0 ? r.value / peak : 0;
                // Koyuluk büyüklüğü izler — ramp'in üst basamakları büyük değerlere.
                const step = NB_SEQUENTIAL[Math.min(
                    NB_SEQUENTIAL.length - 1,
                    Math.floor(ratio * NB_SEQUENTIAL.length),
                )];

                return (
                    <Box
                        key={r.key}
                        onClick={r.onClick}
                        sx={{ cursor: r.onClick ? 'pointer' : 'default' }}
                    >
                        <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mb: 0.5 }}>
                            <Typography sx={{ fontSize: 12.5, color: 'text.secondary', flex: 1 }} noWrap>
                                {r.label}
                            </Typography>
                            <Typography
                                sx={{
                                    fontSize: 13, fontWeight: 700, color: 'text.primary',
                                    fontVariantNumeric: 'tabular-nums',
                                }}
                            >
                                {nbNumber(r.value)}
                            </Typography>
                            <Typography
                                sx={{
                                    fontSize: 11, color: 'text.secondary', width: 36, textAlign: 'right',
                                    fontVariantNumeric: 'tabular-nums',
                                }}
                            >
                                %{nbPct(r.value, total)}
                            </Typography>
                        </Stack>
                        <Tooltip title={`${r.label}: ${nbNumber(r.value)}`} arrow placement="top">
                            <Box
                                sx={{
                                    height: 8,
                                    borderRadius: 4,
                                    bgcolor: 'rgba(27,42,74,0.06)',
                                    overflow: 'hidden',
                                }}
                            >
                                <Box
                                    sx={{
                                        width: `${Math.max(ratio * 100, r.value > 0 ? 2 : 0)}%`,
                                        height: '100%',
                                        borderRadius: 4,
                                        bgcolor: step,
                                        transition: 'width 0.35s ease',
                                    }}
                                />
                            </Box>
                        </Tooltip>
                    </Box>
                );
            })}
        </Stack>
    );
}
