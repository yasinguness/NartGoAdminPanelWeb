import { useMemo } from 'react';
import { Box, Checkbox, CircularProgress, FormControlLabel, Typography } from '@mui/material';
import type { Sector } from '../../services/nartbusiness/nbTypes';

interface Props {
  sectors: Sector[];
  loading?: boolean;
  value: string[];
  onChange: (codes: string[]) => void;
  /** Maks. seçim sayısı, default 3. */
  max?: number;
}

/**
 * ANA sektör seçimi (admin). Katalog tek kaynak (nb-directory); web başvuru formu
 * ve mobil ile aynı kanonik kodlar. Yalnız ÜST kategoriler (parentCode yok) gösterilir
 * — alt-sektör üyenin broad sektör seçimine girmez; tekil `subSectorCode` olarak
 * dizin profilinde (profil düzenleme) seçilir. `max` üzeri seçim disabled olur.
 */
export default function SectorCheckboxGrid({
  sectors,
  loading,
  value,
  onChange,
  max = 3,
}: Props) {
  const mains = useMemo(
    () => sectors.filter((s) => !s.parentCode).sort((a, b) => a.sortOrder - b.sortOrder),
    [sectors],
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
        <CircularProgress size={16} />
        <Typography variant="caption" color="text.secondary">
          Sektörler yükleniyor…
        </Typography>
      </Box>
    );
  }

  if (mains.length === 0) {
    return (
      <Typography variant="caption" color="text.secondary">
        Sektör katalogu boş.
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
        columnGap: 2,
        rowGap: 0.5,
      }}
    >
      {mains.map((s) => {
        const checked = value.includes(s.code);
        const disabled = !checked && value.length >= max;
        return (
          <FormControlLabel
            key={s.code}
            sx={{
              m: 0,
              opacity: disabled ? 0.4 : 1,
              '.MuiFormControlLabel-label': { fontSize: 14 },
            }}
            control={
              <Checkbox
                size="small"
                checked={checked}
                disabled={disabled}
                onChange={() =>
                  onChange(
                    checked
                      ? value.filter((c) => c !== s.code)
                      : [...value, s.code],
                  )
                }
              />
            }
            label={
              <Typography
                component="span"
                variant="body2"
                sx={{ fontWeight: checked ? 600 : 400 }}
              >
                {s.nameTr}
              </Typography>
            }
          />
        );
      })}
    </Box>
  );
}
