/**
 * Durum rozeti — açık zemin, koyu metin.
 *
 * MUI `Chip` bu iş için fazla: kendi yüksekliğini, ikon yuvasını ve silme
 * düğmesini taşır, `size="small"` bile 24px yer kaplar. Durum etiketinin tek
 * işi bir kelimeyi okunur biçimde göstermek.
 */

import { Box } from '@mui/material';
import { nbPill, type NbTone } from './nbStyles';

interface NbPillProps {
    label: string;
    tone?: NbTone;
    title?: string;
}

export default function NbPill({ label, tone = 'neutral', title }: NbPillProps) {
    return (
        <Box component="span" title={title} sx={nbPill(tone)}>
            {label}
        </Box>
    );
}
