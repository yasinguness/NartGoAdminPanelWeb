import { Box, InputAdornment, TextField, Typography } from '@mui/material';

type SocialKind = 'linkedin' | 'website' | 'instagram';

interface Props {
  kind: SocialKind;
  /** Tam URL (linkedin/website) veya handle (instagram). Backend'e gönderilen string. */
  value: string;
  onChange: (full: string) => void;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
}

const META: Record<
  SocialKind,
  {
    label: string;
    prefix: string;
    placeholder: string;
    /** Görsel kullanıcı input'u → kayıt edilecek tam string. */
    pack: (input: string) => string;
    /** Kayıttaki string → kullanıcıya göstereceğimiz parça. */
    unpack: (stored: string) => string;
  }
> = {
  linkedin: {
    label: 'LinkedIn',
    prefix: 'linkedin.com/',
    placeholder: 'in/kullaniciadi',
    pack: (input) =>
      input ? `https://www.linkedin.com/${input.replace(/^\/+/, '')}` : '',
    unpack: (stored) =>
      stored.replace(/^https?:\/\/(www\.)?linkedin\.com\//i, ''),
  },
  website: {
    label: 'Web Sitesi',
    prefix: 'https://',
    placeholder: 'siteniz.com',
    pack: (input) => (input ? `https://${input.replace(/^https?:\/\//i, '')}` : ''),
    unpack: (stored) => stored.replace(/^https?:\/\//i, ''),
  },
  instagram: {
    label: 'Instagram',
    prefix: '@',
    placeholder: 'kullaniciadi',
    pack: (input) =>
      input
        .replace(/^@/, '')
        .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
        .replace(/\/$/, ''),
    unpack: (stored) =>
      stored
        .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
        .replace(/^@/, '')
        .replace(/\/$/, ''),
  },
};

/**
 * Sosyal medya / web URL'i için prefix-chip'li input.
 * Apply formundaki "linkedin.com/" + "in/foo" görsel pattern'inin admin-MUI eşdeğeri.
 */
export default function SocialPrefixField({
  kind,
  value,
  onChange,
  error,
  helperText,
  disabled,
}: Props) {
  const meta = META[kind];
  const visible = meta.unpack(value ?? '');

  return (
    <TextField
      label={meta.label}
      fullWidth
      size="small"
      error={error}
      helperText={helperText ?? ' '}
      disabled={disabled}
      value={visible}
      placeholder={meta.placeholder}
      onChange={(e) => onChange(meta.pack(e.target.value))}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start" sx={{ mr: 1 }}>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                px: 1,
                py: 0.5,
                borderRadius: 0.75,
                bgcolor: 'action.hover',
                userSelect: 'none',
              }}
            >
              <Typography
                component="span"
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 500 }}
              >
                {meta.prefix}
              </Typography>
            </Box>
          </InputAdornment>
        ),
      }}
    />
  );
}
