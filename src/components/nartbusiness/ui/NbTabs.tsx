/**
 * NB detay sekmeleri — klasör sekmesi biçiminde.
 *
 * Sekmeler başlık şeridinin alt kenarına oturur ve aktif olan şeridin alt
 * çizgisini keser (`mb: -1px` + zemin rengi kenarlığı örter). Bu, "bu sekme
 * aşağıdaki yüzeyin kendisi" demenin en kısa yolu; altı çizili bir metin
 * bunu söylemiyor.
 *
 * MUI'nin `Tabs` bileşeni kullanılmadı: onun gösterge çubuğu ve ripple'ı bu
 * dilde yabancı duruyor, bastırmak için yazılacak `sx` bloğu buradaki
 * bileşenden uzun olurdu.
 */

import { Button, Stack } from '@mui/material';
import { nb } from '../../../theme/nbBrand';

export interface NbTabItem<T extends string = string> {
    key: T;
    label: string;
    /** Sekmenin içindeki bekleyen iş sayısı — varsa etikete eklenir. */
    count?: number;
}

interface NbTabsProps<T extends string> {
    items: NbTabItem<T>[];
    value: T;
    onChange: (key: T) => void;
}

export default function NbTabs<T extends string>({ items, value, onChange }: NbTabsProps<T>) {
    return (
        <Stack direction="row" sx={{ gap: '2px' }}>
            {items.map((t) => {
                const active = t.key === value;
                return (
                    <Button
                        key={t.key}
                        disableElevation
                        onClick={() => onChange(t.key)}
                        sx={{
                            border: `1px solid ${nb.border}`,
                            borderBottomColor: active ? nb.surface : nb.border,
                            bgcolor: active ? nb.surface : '#f0efe9',
                            color: active ? nb.text : '#7b858c',
                            fontWeight: active ? 600 : 400,
                            borderRadius: '9px 9px 0 0',
                            px: 2, py: 1.125,
                            fontSize: 12.5,
                            textTransform: 'none',
                            mb: '-1px',
                            '&:hover': { bgcolor: active ? nb.surface : '#e9e7e0' },
                        }}
                    >
                        {t.label}
                        {t.count ? ` · ${t.count}` : ''}
                    </Button>
                );
            })}
        </Stack>
    );
}
