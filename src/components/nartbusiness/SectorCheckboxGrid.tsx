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
 * Apply formundaki sektör checkbox grid'inin admin-MUI eşdeğeri.
 * Katalogdan beslenir; `max` üzeri seçim disabled olur.
 */
export default function SectorCheckboxGrid({
  sectors,
  loading,
  value,
  onChange,
  max = 3,
}: Props) {
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

  if (sectors.length === 0) {
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
      {sectors.map((s) => {
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
