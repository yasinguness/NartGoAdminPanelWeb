import { Box, FormControl, FormControlLabel, Radio, RadioGroup, Skeleton, Stack, Typography } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import type { MembershipTier, TierConfig } from '../../services/nartbusiness/nbTypes';

interface Props {
  tiers: TierConfig[];
  loading?: boolean;
  value: MembershipTier | undefined;
  onChange: (code: MembershipTier) => void;
}

/**
 * `/nb/admin/membership/tiers` listesinden beslenen kademe seçim kartları.
 * Apply formundaki TierStep'in MUI/admin eşdeğeri — fiyat + features + "Davetli" durumu.
 */
export default function TierRadioCardGroup({
  tiers,
  loading,
  value,
  onChange,
}: Props) {
  if (loading) {
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: 1.5,
        }}
      >
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} variant="rounded" height={128} />
        ))}
      </Box>
    );
  }

  if (tiers.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        Kademe katalogu boş — admin panelinden tier konfigürasyonu yap.
      </Typography>
    );
  }

  return (
    <FormControl fullWidth>
      <RadioGroup
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value as MembershipTier)}
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: 1.5,
        }}
      >
        {tiers.map((t) => {
          const selected = value === t.code;
          const priceLabel =
            t.priceAmount > 0
              ? `${t.priceAmount.toLocaleString('tr-TR')} ${t.currency}`
              : 'Davetli';
          return (
            <FormControlLabel
              key={t.id}
              value={t.code}
              sx={{
                m: 0,
                alignItems: 'flex-start',
                p: 1.5,
                border: '2px solid',
                borderColor: selected ? 'primary.main' : 'divider',
                bgcolor: selected ? 'action.selected' : 'background.paper',
                borderRadius: 1.5,
                cursor: 'pointer',
                transition: 'border-color 0.15s ease, background-color 0.15s ease',
                '&:hover': {
                  borderColor: selected ? 'primary.main' : 'primary.light',
                },
                '.MuiFormControlLabel-label': { flexGrow: 1, minWidth: 0, pt: 0.25 },
              }}
              control={<Radio size="small" sx={{ mt: 0 }} />}
              label={
                <Stack spacing={0.75}>
                  <Typography variant="body2" fontWeight={700}>
                    {t.displayName}
                  </Typography>
                  {t.shortDescription && (
                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4 }}>
                      {t.shortDescription}
                    </Typography>
                  )}
                  <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.main' }}>
                    {priceLabel}
                    {t.pricePeriod && (
                      <Typography
                        component="span"
                        variant="caption"
                        color="text.secondary"
                        sx={{ ml: 0.5, fontWeight: 400 }}
                      >
                        /{t.pricePeriod}
                      </Typography>
                    )}
                  </Typography>
                  {t.features.length > 0 && (
                    <Stack spacing={0.25} sx={{ mt: 0.5 }}>
                      {t.features.slice(0, 3).map((f) => (
                        <Stack key={f} direction="row" spacing={0.5} alignItems="center">
                          <CheckCircleOutlineIcon
                            sx={{ fontSize: 13, color: 'success.main' }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {f}
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>
                  )}
                </Stack>
              }
            />
          );
        })}
      </RadioGroup>
    </FormControl>
  );
}
