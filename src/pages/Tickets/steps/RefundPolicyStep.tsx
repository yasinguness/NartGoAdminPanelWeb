/**
 * RefundPolicyStep — İade politikası konfigürasyonu
 * Organizatörün iade yüzdelerini ve kurallarını belirlemesi
 */
import { useState } from 'react';
import {
  Box, Typography, Paper, Switch, Stack, TextField, IconButton, Button,
  Slider, Divider, Tooltip, alpha, useTheme, styled, Fade, Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
  RestartAlt as ResetIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { RefundPolicy, RefundPolicyTier, DEFAULT_REFUND_POLICY } from '../../../types/tickets/ticketTypes';

interface RefundPolicyStepProps {
  policy: RefundPolicy;
  onChange: (policy: RefundPolicy) => void;
}

const TierCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: 12,
  border: `1px solid ${theme.palette.divider}`,
  transition: 'border-color 0.2s',
  '&:hover': {
    borderColor: theme.palette.primary.light,
  },
}));

const PERCENTAGE_COLORS: Record<number, string> = {
  100: '#22c55e',
  75: '#84cc16',
  50: '#f59e0b',
  25: '#f97316',
  0: '#ef4444',
};

function getPercentageColor(pct: number): string {
  if (pct >= 100) return PERCENTAGE_COLORS[100];
  if (pct >= 75) return PERCENTAGE_COLORS[75];
  if (pct >= 50) return PERCENTAGE_COLORS[50];
  if (pct >= 25) return PERCENTAGE_COLORS[25];
  return PERCENTAGE_COLORS[0];
}

function tierLabel(tier: RefundPolicyTier): string {
  if (tier.maxDaysBefore === null) return `${tier.minDaysBefore}+ gün önce`;
  if (tier.minDaysBefore === 0 && tier.maxDaysBefore <= 1) return 'Son 24 saat';
  return `${tier.minDaysBefore}–${tier.maxDaysBefore} gün önce`;
}

export default function RefundPolicyStep({ policy, onChange }: RefundPolicyStepProps) {
  const theme = useTheme();

  const handleToggleRefundable = () => {
    onChange({ ...policy, isRefundable: !policy.isRefundable });
  };

  const handleTierChange = (index: number, updates: Partial<RefundPolicyTier>) => {
    const newTiers = [...policy.tiers];
    newTiers[index] = { ...newTiers[index], ...updates };
    onChange({ ...policy, tiers: newTiers });
  };

  const handleAddTier = () => {
    const newTier: RefundPolicyTier = {
      minDaysBefore: 0,
      maxDaysBefore: 1,
      refundPercentage: 50,
      requiresManualApproval: true,
    };
    onChange({ ...policy, tiers: [...policy.tiers, newTier] });
  };

  const handleRemoveTier = (index: number) => {
    onChange({ ...policy, tiers: policy.tiers.filter((_, i) => i !== index) });
  };

  const handleResetToDefault = () => {
    onChange({ ...DEFAULT_REFUND_POLICY });
  };

  return (
    <Box>
      {/* Başlık */}
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>
        İade Politikası
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Bilet iade kurallarını belirleyin. Bu ayarlar tüm bilet türleri için geçerli olur.
      </Typography>

      {/* İade açma/kapama */}
      <Paper
        elevation={0}
        sx={{
          p: 2, borderRadius: 2, mb: 3,
          border: `1px solid ${theme.palette.divider}`,
          bgcolor: policy.isRefundable
            ? alpha(theme.palette.success.main, 0.04)
            : alpha(theme.palette.error.main, 0.04),
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box sx={{
              width: 40, height: 40, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              bgcolor: policy.isRefundable
                ? alpha(theme.palette.success.main, 0.12)
                : alpha(theme.palette.error.main, 0.12),
            }}>
              {policy.isRefundable
                ? <CheckIcon sx={{ color: 'success.main' }} />
                : <DeleteIcon sx={{ color: 'error.main' }} />}
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={700}>
                {policy.isRefundable ? 'İade aktif' : 'İade kapalı'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {policy.isRefundable
                  ? 'Kullanıcılar belirlenen kurallara göre biletlerini iade edebilir'
                  : 'Bu etkinlik için bilet iadesi yapılamaz'}
              </Typography>
            </Box>
          </Stack>
          <Switch checked={policy.isRefundable} onChange={handleToggleRefundable} />
        </Stack>
      </Paper>

      {/* İade kuralları */}
      {policy.isRefundable && (
        <Fade in>
          <Box>
            {/* Başlık + Reset */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={600}>
                İade Zaman Dilimleri
              </Typography>
              <Tooltip title="Önerilen varsayılan politikaya sıfırla">
                <Button
                  size="small"
                  startIcon={<ResetIcon />}
                  onClick={handleResetToDefault}
                  sx={{ textTransform: 'none', fontSize: 12 }}
                >
                  Varsayılana Dön
                </Button>
              </Tooltip>
            </Stack>

            {/* Tier listesi */}
            <Stack spacing={2} sx={{ mb: 2 }}>
              {policy.tiers.map((tier, index) => (
                <TierCard key={index} elevation={0}>
                  <Stack spacing={2}>
                    {/* Üst satır: Zaman aralığı ve yüzde */}
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Chip
                        label={tierLabel(tier)}
                        size="small"
                        sx={{
                          fontWeight: 700, fontSize: 12,
                          bgcolor: alpha(getPercentageColor(tier.refundPercentage), 0.1),
                          color: getPercentageColor(tier.refundPercentage),
                          border: `1px solid ${alpha(getPercentageColor(tier.refundPercentage), 0.3)}`,
                        }}
                      />
                      <Typography
                        variant="h6"
                        fontWeight={800}
                        sx={{ color: getPercentageColor(tier.refundPercentage), minWidth: 60 }}
                      >
                        %{tier.refundPercentage}
                      </Typography>
                      <Box sx={{ flex: 1 }}>
                        <Slider
                          value={tier.refundPercentage}
                          onChange={(_, val) => handleTierChange(index, { refundPercentage: val as number })}
                          min={0}
                          max={100}
                          step={5}
                          sx={{
                            color: getPercentageColor(tier.refundPercentage),
                            '& .MuiSlider-thumb': { width: 16, height: 16 },
                          }}
                        />
                      </Box>
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveTier(index)}
                        disabled={policy.tiers.length <= 1}
                        sx={{ color: 'text.disabled' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>

                    {/* Alt satır: Gün aralığı ve onay */}
                    <Stack direction="row" spacing={2} alignItems="center">
                      <TextField
                        label="Min gün"
                        type="number"
                        size="small"
                        value={tier.minDaysBefore}
                        onChange={(e) => handleTierChange(index, { minDaysBefore: Number(e.target.value) })}
                        sx={{ width: 100 }}
                        inputProps={{ min: 0 }}
                      />
                      <Typography variant="body2" color="text.secondary">—</Typography>
                      <TextField
                        label="Max gün"
                        type="number"
                        size="small"
                        value={tier.maxDaysBefore ?? ''}
                        onChange={(e) => handleTierChange(index, {
                          maxDaysBefore: e.target.value ? Number(e.target.value) : null,
                        })}
                        placeholder="∞"
                        sx={{ width: 100 }}
                        inputProps={{ min: 0 }}
                      />
                      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ ml: 'auto' }}>
                        <Switch
                          size="small"
                          checked={tier.requiresManualApproval}
                          onChange={(e) => handleTierChange(index, { requiresManualApproval: e.target.checked })}
                        />
                        <Typography variant="caption" color="text.secondary">
                          Manuel onay
                        </Typography>
                      </Stack>
                    </Stack>
                  </Stack>
                </TierCard>
              ))}
            </Stack>

            {/* Tier ekle */}
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={handleAddTier}
              sx={{ textTransform: 'none', mb: 3 }}
            >
              Zaman dilimi ekle
            </Button>

            <Divider sx={{ mb: 2 }} />

            {/* Platform komisyonu */}
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  Platform komisyonu iade edilsin mi?
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  NartGo işlem ücreti iade durumunda da iade edilir
                </Typography>
              </Box>
              <Switch
                checked={policy.platformFeeRefundable}
                onChange={(e) => onChange({ ...policy, platformFeeRefundable: e.target.checked })}
              />
            </Stack>

            {/* Notlar */}
            <TextField
              fullWidth
              multiline
              rows={2}
              size="small"
              label="İade politikası notu (opsiyonel)"
              placeholder="Kullanıcılara gösterilecek ek açıklama..."
              value={policy.notes || ''}
              onChange={(e) => onChange({ ...policy, notes: e.target.value })}
              sx={{ mt: 2 }}
            />
          </Box>
        </Fade>
      )}
    </Box>
  );
}
