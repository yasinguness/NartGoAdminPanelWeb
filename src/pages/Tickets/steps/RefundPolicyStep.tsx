/**
 * RefundPolicyStep — İade politikası konfigürasyonu (Redesigned)
 *
 * Fixes applied:
 * 1. Slider → segmented preset buttons (%0/%25/%50/%75/%100)
 * 2. Cards → collapsible accordion (summary header, expand for details)
 * 3. Badge auto-computed from min/max values (reactive)
 * 4. Overlap detection + inline warning
 * 5. Manuel onay tooltip explaining what it does
 * 6. User-facing preview panel at the bottom
 * 7. Platform komisyonu only visible when refund is active
 */
import { useState } from 'react';
import {
  Box, Typography, Paper, Switch, Stack, TextField, IconButton, Button,
  Divider, Tooltip, alpha, useTheme, styled, Fade, Chip, Collapse,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  RestartAlt as ResetIcon,
  ExpandMore as ExpandIcon,
  Visibility as PreviewIcon,
  HelpOutline as HelpIcon,
  DragIndicator as DragIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { RefundPolicy, RefundPolicyTier, DEFAULT_REFUND_POLICY } from '../../../types/tickets/ticketTypes';

interface RefundPolicyStepProps {
  policy: RefundPolicy;
  onChange: (policy: RefundPolicy) => void;
}

// ─── Constants ─────────────────────────────────────────
const REFUND_PRESETS = [100, 75, 50, 25, 0] as const;

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

/** Auto-compute label from min/max days */
function tierLabel(tier: RefundPolicyTier): string {
  if (tier.maxDaysBefore === null || tier.maxDaysBefore === undefined) return `${tier.minDaysBefore}+ gün önce`;
  if (tier.minDaysBefore === 0 && tier.maxDaysBefore <= 1) return 'Son 24 saat';
  return `${tier.minDaysBefore}–${tier.maxDaysBefore} gün önce`;
}

/** Check if tiers have overlaps or gaps */
function detectOverlaps(tiers: RefundPolicyTier[]): string[] {
  const warnings: string[] = [];
  const sorted = [...tiers].sort((a, b) => (b.maxDaysBefore ?? 999) - (a.maxDaysBefore ?? 999));

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    const currentMin = current.minDaysBefore;
    const nextMax = next.maxDaysBefore ?? 999;

    if (nextMax > currentMin) {
      warnings.push(`"${tierLabel(current)}" ve "${tierLabel(next)}" dilimleri örtüşüyor`);
    } else if (nextMax < currentMin) {
      warnings.push(`${nextMax}–${currentMin} gün arası kapsanmamış`);
    }
  }
  return warnings;
}

// ─── Styled ────────────────────────────────────────────
const TierCard = styled(Paper)(({ theme }) => ({
  borderRadius: 12,
  border: `1px solid ${theme.palette.divider}`,
  overflow: 'hidden',
  transition: 'border-color 0.2s',
  '&:hover': {
    borderColor: theme.palette.primary.light,
  },
}));

const PresetButton = styled(Button, { shouldForwardProp: (p) => p !== '$active' && p !== '$color' })<{ $active?: boolean; $color?: string }>(({ theme, $active, $color }) => ({
  minWidth: 52,
  height: 36,
  borderRadius: 8,
  fontWeight: 700,
  fontSize: 13,
  textTransform: 'none',
  border: `2px solid ${$active ? ($color || theme.palette.primary.main) : theme.palette.divider}`,
  background: $active ? alpha($color || theme.palette.primary.main, 0.08) : 'transparent',
  color: $active ? ($color || theme.palette.primary.main) : theme.palette.text.secondary,
  '&:hover': {
    background: alpha($color || theme.palette.primary.main, 0.12),
    borderColor: $color || theme.palette.primary.main,
  },
}));

// ─── Summary Stats ─────────────────────────────────────
function PolicyStats({ policy }: { policy: RefundPolicy }) {
  const theme = useTheme();
  const maxRefund = policy.tiers.length > 0 ? Math.max(...policy.tiers.map(t => t.refundPercentage)) : 0;
  const minRefund = policy.tiers.length > 0 ? Math.min(...policy.tiers.map(t => t.refundPercentage)) : 0;
  const manualCount = policy.tiers.filter(t => t.requiresManualApproval).length;

  const stats = [
    { label: 'Zaman dilimi', value: policy.tiers.length, color: theme.palette.info.main },
    { label: 'Maks. iade', value: `%${maxRefund}`, color: getPercentageColor(maxRefund) },
    { label: 'Son 24 saat', value: `%${minRefund}`, color: getPercentageColor(minRefund) },
    { label: 'Manuel onaylı', value: manualCount, color: theme.palette.warning.main },
  ];

  return (
    <Stack direction="row" spacing={1.5} sx={{ mb: 2.5 }}>
      {stats.map((s, i) => (
        <Paper key={i} variant="outlined" sx={{ flex: 1, p: 1.5, borderRadius: 2, textAlign: 'center' }}>
          <Typography variant="subtitle2" fontWeight={800} sx={{ color: s.color }}>{s.value}</Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>{s.label}</Typography>
        </Paper>
      ))}
    </Stack>
  );
}

// ─── Timeline Visualization ────────────────────────────
function TimelineBar({ tiers }: { tiers: RefundPolicyTier[] }) {
  const theme = useTheme();
  const sorted = [...tiers].sort((a, b) => (b.maxDaysBefore ?? 999) - (a.maxDaysBefore ?? 999));

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase" letterSpacing={0.5} sx={{ mb: 1, display: 'block' }}>
        Kapsam Görünümü (Etkinlik Gününden Geriye)
      </Typography>
      <Stack direction="row" sx={{ height: 32, borderRadius: 2, overflow: 'hidden', border: `1px solid ${theme.palette.divider}` }}>
        {sorted.map((tier, i) => {
          const color = getPercentageColor(tier.refundPercentage);
          return (
            <Box key={i} sx={{
              flex: 1, bgcolor: alpha(color, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRight: i < sorted.length - 1 ? `2px solid ${theme.palette.background.paper}` : 'none',
            }}>
              <Typography variant="caption" fontWeight={700} sx={{ color, fontSize: 10 }}>
                {tierLabel(tier)} %{tier.refundPercentage}
              </Typography>
            </Box>
          );
        })}
      </Stack>
      <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
        <Typography variant="caption" color="text.disabled">← Önceden</Typography>
        <Typography variant="caption" color="text.disabled">Etkinlik →</Typography>
      </Stack>
    </Box>
  );
}

// ─── User Preview ──────────────────────────────────────
function UserPreview({ policy }: { policy: RefundPolicy }) {
  const sorted = [...policy.tiers].sort((a, b) => (b.maxDaysBefore ?? 999) - (a.maxDaysBefore ?? 999));

  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', mt: 3 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 2.5, py: 1.5, bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'divider' }}>
        <PreviewIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
        <Typography variant="caption" fontWeight={700} color="text.secondary">Katılımcıya görünen hali</Typography>
      </Stack>
      <Box sx={{ px: 2.5, py: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>İade Politikası</Typography>
        <Stack spacing={0.75}>
          {sorted.map((tier, i) => (
            <Stack key={i} direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="text.secondary">{tierLabel(tier)}</Typography>
              <Typography variant="body2" fontWeight={700} sx={{ color: getPercentageColor(tier.refundPercentage) }}>
                {tier.refundPercentage === 0
                  ? 'İade yok (%0)'
                  : tier.refundPercentage === 100
                    ? `Tam iade (%100)`
                    : `%${tier.refundPercentage} iade`}
                {tier.requiresManualApproval && (
                  <Typography component="span" variant="caption" color="text.disabled"> · Manuel onay</Typography>
                )}
              </Typography>
            </Stack>
          ))}
        </Stack>
        {policy.notes && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block', fontStyle: 'normal' }}>
            {policy.notes}
          </Typography>
        )}
      </Box>
    </Paper>
  );
}

// ─── Main Component ────────────────────────────────────
export default function RefundPolicyStep({ policy, onChange }: RefundPolicyStepProps) {
  const theme = useTheme();
  const [expandedTier, setExpandedTier] = useState<number | null>(0);

  const warnings = policy.isRefundable ? detectOverlaps(policy.tiers) : [];

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
    setExpandedTier(policy.tiers.length); // Expand the new one
  };

  const handleRemoveTier = (index: number) => {
    onChange({ ...policy, tiers: policy.tiers.filter((_, i) => i !== index) });
    if (expandedTier === index) setExpandedTier(null);
    else if (expandedTier !== null && expandedTier > index) setExpandedTier(expandedTier - 1);
  };

  const handleResetToDefault = () => {
    onChange({ ...DEFAULT_REFUND_POLICY });
    setExpandedTier(0);
  };

  return (
    <Box>
      {/* Başlık + Toggle */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>İade Politikası</Typography>
          <Typography variant="body2" color="text.secondary">
            Bilet iade kurallarını belirleyin. Tüm bilet türleri için geçerlidir.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="caption" fontWeight={600} color={policy.isRefundable ? 'success.main' : 'text.disabled'}>
            İade {policy.isRefundable ? 'aktif' : 'kapalı'}
          </Typography>
          <Switch checked={policy.isRefundable} onChange={handleToggleRefundable} color="success" />
        </Stack>
      </Stack>

      {/* İade kapalıysa kısa mesaj */}
      {!policy.isRefundable && (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, textAlign: 'center', bgcolor: alpha(theme.palette.error.main, 0.03) }}>
          <Typography sx={{ fontSize: 32, mb: 1, opacity: 0.3 }}>🚫</Typography>
          <Typography variant="body2" color="text.secondary">Bu etkinlik için bilet iadesi yapılamaz.</Typography>
        </Paper>
      )}

      {/* İade aktifken */}
      {policy.isRefundable && (
        <Fade in>
          <Box>
            {/* Stats */}
            <PolicyStats policy={policy} />

            {/* Overlap warnings */}
            {warnings.length > 0 && (
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, mb: 2, bgcolor: alpha(theme.palette.warning.main, 0.06), borderColor: alpha(theme.palette.warning.main, 0.3) }}>
                <Stack direction="row" spacing={1} alignItems="flex-start">
                  <WarningIcon sx={{ fontSize: 18, color: 'warning.main', mt: 0.2 }} />
                  <Box>
                    {warnings.map((w, i) => (
                      <Typography key={i} variant="caption" color="warning.main" fontWeight={600} display="block">{w}</Typography>
                    ))}
                    <Typography variant="caption" color="text.secondary">Dilimler örtüşmemeli. Tüm günler kapsanmazsa aradaki süre için iade yapılamaz.</Typography>
                  </Box>
                </Stack>
              </Paper>
            )}

            {/* Timeline */}
            <TimelineBar tiers={policy.tiers} />

            {/* Tier heading + reset */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
              <Typography variant="subtitle2" fontWeight={600}>Zaman Dilimleri</Typography>
              <Tooltip title="Önerilen varsayılan politikaya sıfırla">
                <Button size="small" startIcon={<ResetIcon />} onClick={handleResetToDefault}
                  sx={{ textTransform: 'none', fontSize: 12, color: 'text.secondary' }}>
                  Varsayılana Dön
                </Button>
              </Tooltip>
            </Stack>

            {/* Tier List — Accordion style */}
            <Stack spacing={1.5} sx={{ mb: 2 }}>
              {policy.tiers.map((tier, index) => {
                const isExpanded = expandedTier === index;
                const color = getPercentageColor(tier.refundPercentage);
                return (
                  <TierCard key={index} elevation={0}>
                    {/* Collapsed Header — always visible */}
                    <Stack
                      direction="row" spacing={1.5} alignItems="center"
                      sx={{ px: 2, py: 1.5, cursor: 'pointer', '&:hover': { bgcolor: 'grey.50' } }}
                      onClick={() => setExpandedTier(isExpanded ? null : index)}
                    >
                      <DragIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                      <Chip
                        label={tierLabel(tier)}
                        size="small"
                        sx={{
                          fontWeight: 700, fontSize: 11,
                          bgcolor: alpha(color, 0.1),
                          color: color,
                          border: `1px solid ${alpha(color, 0.3)}`,
                        }}
                      />
                      {tier.requiresManualApproval && (
                        <Chip label="Manuel onay aktif" size="small" color="warning" variant="outlined" sx={{ height: 22, fontSize: 10, fontWeight: 600 }} />
                      )}
                      <Box sx={{ flex: 1 }} />
                      <Typography variant="subtitle1" fontWeight={800} sx={{ color, mr: 1 }}>%{tier.refundPercentage}</Typography>
                      <ExpandIcon sx={{
                        fontSize: 20, color: 'text.secondary',
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                      }} />
                    </Stack>

                    {/* Expanded Detail */}
                    <Collapse in={isExpanded}>
                      <Box sx={{ px: 2, pb: 2, pt: 0.5, borderTop: '1px solid', borderColor: 'divider' }}>
                        {/* Preset buttons — Fix #1 */}
                        <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase" sx={{ mb: 1, display: 'block' }}>
                          İade Oranı
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                          {REFUND_PRESETS.map(pct => (
                            <PresetButton
                              key={pct}
                              $active={tier.refundPercentage === pct}
                              $color={getPercentageColor(pct)}
                              onClick={() => handleTierChange(index, { refundPercentage: pct })}
                            >
                              %{pct}
                            </PresetButton>
                          ))}
                        </Stack>

                        {/* Day range — Fix #3 */}
                        <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase" sx={{ mb: 1, display: 'block' }}>
                          Gün Aralığı
                        </Typography>
                        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                          <TextField
                            label="Min"
                            type="number"
                            size="small"
                            value={tier.minDaysBefore}
                            onChange={(e) => handleTierChange(index, { minDaysBefore: Math.max(0, Number(e.target.value)) })}
                            sx={{ width: 90 }}
                            inputProps={{ min: 0 }}
                          />
                          <Typography variant="body2" color="text.disabled">—</Typography>
                          <TextField
                            label="Max"
                            type="number"
                            size="small"
                            value={tier.maxDaysBefore ?? ''}
                            onChange={(e) => handleTierChange(index, {
                              maxDaysBefore: e.target.value ? Math.max(0, Number(e.target.value)) : null,
                            })}
                            placeholder="∞"
                            sx={{ width: 90 }}
                            inputProps={{ min: 0 }}
                          />
                          <Typography variant="caption" color="text.secondary">ve üzeri gün</Typography>
                        </Stack>

                        {/* Manuel onay — Fix #5 */}
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <Switch
                              size="small"
                              checked={tier.requiresManualApproval}
                              onChange={(e) => handleTierChange(index, { requiresManualApproval: e.target.checked })}
                            />
                            <Typography variant="body2" fontWeight={500}>Manuel onay</Typography>
                            <Tooltip title="Aktifse iade talebi otomatik işlenmez, admin onayı bekler." arrow>
                              <HelpIcon sx={{ fontSize: 15, color: 'text.disabled', cursor: 'pointer' }} />
                            </Tooltip>
                          </Stack>
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveTier(index)}
                            disabled={policy.tiers.length <= 1}
                            sx={{ color: 'text.disabled', '&:hover': { color: 'error.main', bgcolor: alpha(theme.palette.error.main, 0.08) } }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </Box>
                    </Collapse>
                  </TierCard>
                );
              })}
            </Stack>

            {/* Add tier */}
            <Button
              size="small" variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddTier}
              sx={{ textTransform: 'none', mb: 3, borderStyle: 'dashed', borderRadius: 2.5, fontWeight: 600 }}
            >
              + Zaman Dilimi Ekle
            </Button>

            <Divider sx={{ mb: 2 }} />

            {/* Ek Ayarlar — Fix #7: only visible when refund is active */}
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>Ek Ayarlar</Typography>

            <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden', mb: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2.5, py: 1.5 }}>
                <Box>
                  <Typography variant="body2" fontWeight={600}>Platform komisyonu iade edilsin mi?</Typography>
                  <Typography variant="caption" color="text.secondary">NartGo işlem ücreti iade durumunda da iade edilir</Typography>
                </Box>
                <Switch
                  checked={policy.platformFeeRefundable}
                  onChange={(e) => onChange({ ...policy, platformFeeRefundable: e.target.checked })}
                />
              </Stack>
            </Paper>

            {/* İade Politikası Notu */}
            <Box>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>İade Politikası Notu</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>Bilet sayfasında katılımcılara gösterilir</Typography>
              <TextField
                fullWidth
                multiline
                rows={2}
                size="small"
                placeholder="Örn: İade talepleri 3 iş günü içinde işleme alınır..."
                value={policy.notes || ''}
                onChange={(e) => onChange({ ...policy, notes: e.target.value })}
              />
            </Box>

            {/* Fix #6: User-facing preview */}
            <UserPreview policy={policy} />
          </Box>
        </Fade>
      )}
    </Box>
  );
}
