import type { ReactNode } from 'react';
import {
  Box,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  Radio,
  RadioGroup,
  Typography,
} from '@mui/material';

export interface RadioCardOption<V extends string> {
  value: V;
  title: ReactNode;
  description?: ReactNode;
  /** Sağ tarafa küçük badge/chip yerleştirmek için (örn. fiyat, uyarı). */
  trailing?: ReactNode;
  disabled?: boolean;
}

interface Props<V extends string> {
  label?: ReactNode;
  options: RadioCardOption<V>[];
  value: V | undefined;
  onChange: (v: V) => void;
  disabled?: boolean;
  helperText?: ReactNode;
  /** "row" sıralama için (kısa seçenekler). Default sütun. */
  row?: boolean;
  /** Group-level error rendering. */
  error?: boolean;
}

export default function RadioCardGroup<V extends string>({
  label,
  options,
  value,
  onChange,
  disabled,
  helperText,
  row,
  error,
}: Props<V>) {
  return (
    <FormControl disabled={disabled} error={error} fullWidth>
      {label && <FormLabel sx={{ mb: 1 }}>{label}</FormLabel>}
      <RadioGroup
        row={row}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value as V)}
        sx={{
          gap: 1,
          flexDirection: row ? 'row' : 'column',
        }}
      >
        {options.map((opt) => (
          <FormControlLabel
            key={opt.value}
            value={opt.value}
            disabled={disabled || opt.disabled}
            control={<Radio size="small" sx={{ mt: 0.25 }} />}
            sx={{
              alignItems: 'flex-start',
              m: 0,
              px: 1.5,
              py: 1.25,
              border: '1.5px solid',
              borderColor: value === opt.value ? 'primary.main' : 'divider',
              borderRadius: 1.5,
              bgcolor: value === opt.value ? 'action.selected' : 'background.paper',
              transition: 'border-color 0.15s ease, background-color 0.15s ease',
              cursor: disabled || opt.disabled ? 'default' : 'pointer',
              '&:hover': {
                borderColor: disabled || opt.disabled ? 'divider' : 'primary.light',
                bgcolor: disabled || opt.disabled ? 'background.paper' : 'action.hover',
              },
              '.MuiFormControlLabel-label': { flexGrow: 1, minWidth: 0, pt: 0.25 },
            }}
            label={
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="body2" component="div" fontWeight={600}>
                    {opt.title}
                  </Typography>
                  {opt.description && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      component="div"
                      sx={{ mt: 0.5, lineHeight: 1.5 }}
                    >
                      {opt.description}
                    </Typography>
                  )}
                </Box>
                {opt.trailing && <Box sx={{ ml: 1, flexShrink: 0 }}>{opt.trailing}</Box>}
              </Box>
            }
          />
        ))}
      </RadioGroup>
      {helperText && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl>
  );
}
