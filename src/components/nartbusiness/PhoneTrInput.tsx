import { Box, InputAdornment, TextField, Typography } from '@mui/material';

interface Props {
  /** 10 haneli GSM numarası (ülke kodu hariç, sadece rakam). */
  value: string;
  onChange: (gsmNo: string) => void;
  label?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  error?: boolean;
}

/** "5XX XXX XX XX" şeklinde göstermek için ekrana basılan maske. */
function formatTr(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  return digits.replace(
    /^(\d{0,3})(\d{0,3})(\d{0,2})(\d{0,2}).*$/,
    (_, a, b, c, d) => [a, b, c, d].filter(Boolean).join(' '),
  );
}

/**
 * Türkiye GSM numarası girişi.
 * "🇹🇷 +90" prefix chip + maskeli 10 haneli rakam input.
 * `value` ve `onChange` sadece rakam (gsmNo) ile çalışır; ülke kodu UI'da sabit.
 */
export default function PhoneTrInput({
  value,
  onChange,
  label = 'Telefon',
  helperText,
  required,
  disabled,
  error,
}: Props) {
  const display = formatTr(value);

  return (
    <TextField
      label={label}
      required={required}
      disabled={disabled}
      error={error}
      fullWidth
      size="small"
      value={display}
      placeholder="5XX XXX XX XX"
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
        onChange(digits);
      }}
      helperText={helperText ?? ' '}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start" sx={{ mr: 1 }}>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                px: 1,
                py: 0.5,
                borderRadius: 0.75,
                bgcolor: 'action.hover',
                userSelect: 'none',
              }}
            >
              <Typography component="span" sx={{ fontSize: 13 }}>
                🇹🇷
              </Typography>
              <Typography
                component="span"
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 600 }}
              >
                +90
              </Typography>
            </Box>
          </InputAdornment>
        ),
      }}
      inputProps={{ inputMode: 'tel', maxLength: 13 }}
    />
  );
}
