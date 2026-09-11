/**
 * Toplu işlem şeridi — seçim varken tablo başlığının üstünde beliren koyu bar.
 *
 * Koyu zemin bilinçli: şerit geçici bir kip (seçim kipi) açar, sayfanın geri
 * kalanıyla aynı aydınlık yüzeyde durursa kip görünmez olur.
 *
 * Şerit **yalnız seçim varken** vardır. Boş bir toplu işlem çubuğunu sürekli
 * göstermek, her satırda kullanılmayan bir kolon tutmakla aynı israf.
 */

import { Button, Stack, Typography } from '@mui/material';
import { nb, nbRadius } from '../../../theme/nbBrand';

export interface NbBulkAction {
    label: string;
    onClick: () => void;
    /** Çerçeveli, dolgusuz görünüm — "seçimi temizle" gibi geri dönüşler. */
    ghost?: boolean;
}

interface NbBulkBarProps {
    count: number;
    actions: NbBulkAction[];
    /** "3 üye seçildi" yerine kendi metnini vermek istersen. */
    label?: string;
}

export default function NbBulkBar({ count, actions, label }: NbBulkBarProps) {
    if (count === 0) return null;

    return (
        <Stack
            direction="row"
            flexWrap="wrap"
            alignItems="center"
            sx={{ gap: 1.25, px: 2, py: 1.375, bgcolor: nb.navy, color: nb.onDark }}
        >
            <Typography sx={{ fontSize: 12.5 }}>{label ?? `${count} üye seçildi`}</Typography>
            <Stack direction="row" flexWrap="wrap" sx={{ gap: 0.875, ml: 'auto' }}>
                {actions.map((a) => (
                    <Button
                        key={a.label}
                        disableElevation
                        onClick={a.onClick}
                        sx={{
                            border: '1px solid rgba(255,255,255,.2)',
                            bgcolor: a.ghost ? 'transparent' : nb.gold,
                            color: a.ghost ? '#cfd8de' : nb.navy,
                            borderRadius: `${nbRadius.controlSm}px`,
                            px: 1.5,
                            py: 0.75,
                            fontSize: 11.5,
                            fontWeight: a.ghost ? 400 : 600,
                            textTransform: 'none',
                            whiteSpace: 'nowrap',
                            '&:hover': { bgcolor: a.ghost ? 'rgba(255,255,255,.08)' : '#c2952d' },
                        }}
                    >
                        {a.label}
                    </Button>
                ))}
            </Stack>
        </Stack>
    );
}
