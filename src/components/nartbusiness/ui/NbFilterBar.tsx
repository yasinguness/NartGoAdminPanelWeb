/**
 * NB filtre barı — tablonun tepesindeki arama + açık/kapalı çipler.
 *
 * Arama ve filtreler tek şeritte durur, tablonun içinde: ayrı ayrı yüzerken
 * sayfanın neresinin kontrol neresinin sonuç olduğu belirsizleşiyordu.
 *
 * Çipler çoklu seçim. Açık/kapalı ayrımı doluluk ile yapılır (lacivert dolgu),
 * renk tonuyla değil — altın burada kullanılsa "birincil aksiyon" işareti
 * ucuzlardı.
 */

import type { ReactNode } from 'react';
import { Button, InputBase, Stack } from '@mui/material';
import { nb, nbRadius } from '../../../theme/nbBrand';
import { nbChip, nbDividerLine } from './nbStyles';

export interface NbFilterChip {
    key: string;
    label: string;
    active: boolean;
    onToggle: () => void;
}

interface NbFilterBarProps {
    search?: string;
    onSearch?: (value: string) => void;
    placeholder?: string;
    chips?: NbFilterChip[];
    /** Şeridin sağ ucu — sıralama seçici, kayıt sayısı vb. */
    trailing?: ReactNode;
}

export default function NbFilterBar({
    search, onSearch, placeholder = 'Ara…', chips = [], trailing,
}: NbFilterBarProps) {
    return (
        <Stack
            direction="row"
            flexWrap="wrap"
            alignItems="center"
            sx={{ gap: 1, px: 1.75, py: 1.5, borderBottom: nbDividerLine }}
        >
            {onSearch && (
                <InputBase
                    value={search ?? ''}
                    onChange={(e) => onSearch(e.target.value)}
                    placeholder={placeholder}
                    sx={{
                        flex: '1 1 220px',
                        minWidth: 0,
                        border: `1px solid ${nb.inputBorder}`,
                        bgcolor: nb.inputBg,
                        borderRadius: `${nbRadius.control}px`,
                        px: 1.375,
                        py: 0.5,
                        fontSize: 12.5,
                        '&.Mui-focused': { borderColor: nb.navy },
                    }}
                />
            )}

            {chips.map((c) => (
                <Button key={c.key} disableElevation onClick={c.onToggle} sx={nbChip(c.active)}>
                    {c.label}
                </Button>
            ))}

            {trailing && <Stack direction="row" alignItems="center" sx={{ gap: 1, ml: 'auto' }}>{trailing}</Stack>}
        </Stack>
    );
}
