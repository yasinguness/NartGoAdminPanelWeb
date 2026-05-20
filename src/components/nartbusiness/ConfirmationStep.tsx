import type { ReactNode } from 'react';
import { Alert, Box, Stack, Typography } from '@mui/material';
import NbSectionPaper from './NbSectionPaper';

/**
 * Yüksek-etki / geri-alınamaz form submit'lerinin son adımı için standart özet bloğu.
 *
 * Her section bir {@link NbSectionPaper}'a sarılır — wizard'ın diğer adımlarıyla
 * görsel tutarlılık için. Caller bölümleri ve son uyarıyı verir; bileşen
 * tutarlı bir başlık + key-value listesi düzeni üretir.
 */

export interface ConfirmationSection {
  title: ReactNode;
  /** Key-value satırları — değer null/undefined ise satır atlanır. */
  rows?: Array<{ label: ReactNode; value: ReactNode | null | undefined }>;
  /** Serbest içerik (audit notu monospaced gösterimi gibi). */
  content?: ReactNode;
}

interface Props {
  /** En üstte gösterilecek genel info / context Alert'i. */
  intro?: ReactNode;
  sections: ConfirmationSection[];
  /** En altta tetiklenecek uyarı(lar) — yüksek-etki işlem tasdiki. */
  warning?: ReactNode;
}

export default function ConfirmationStep({ intro, sections, warning }: Props) {
  return (
    <Stack spacing={2.5}>
      {intro && <Alert severity="info">{intro}</Alert>}

      {sections.map((s, idx) => (
        <NbSectionPaper key={idx} title={s.title}>
          {s.rows && (
            <Stack spacing={0.5}>
              {s.rows
                .filter(
                  (r) => r.value !== null && r.value !== undefined && r.value !== '',
                )
                .map((r, i) => (
                  <Box key={i} sx={{ display: 'flex', gap: 1 }}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ minWidth: 140, flexShrink: 0 }}
                    >
                      {r.label}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ flexGrow: 1, wordBreak: 'break-word' }}
                    >
                      {r.value}
                    </Typography>
                  </Box>
                ))}
            </Stack>
          )}
          {s.content}
        </NbSectionPaper>
      ))}

      {warning && <Alert severity="warning">{warning}</Alert>}
    </Stack>
  );
}
