import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControlLabel,
  FormGroup,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { nbAdminService } from '../../services/nartbusiness/nbAdminService';
import type { MembershipTier, TierDocumentPolicy, VerificationDocumentType } from '../../services/nartbusiness/nbTypes';
import { DOC_TYPE_LABELS } from './verificationShared';

const ALL_TIERS: MembershipTier[] = ['KURUCU', 'PATRON', 'STANDART', 'GENC_GIRISIMCI'];
const ALL_DOC_TYPES: VerificationDocumentType[] = [
  'VERGI_LEVHASI',
  'TICARET_SICIL',
  'IMZA_SIRKULERI',
  'KIMLIK',
  'KULTUREL_BEYAN',
];

const TIER_LABELS: Record<MembershipTier, string> = {
  KURUCU: 'Kurucu',
  PATRON: 'Patron',
  STANDART: 'Standart',
  GENC_GIRISIMCI: 'Genç Girişimci',
};

const TIER_DESCRIPTIONS: Record<MembershipTier, string> = {
  KURUCU: 'Tam KYC — şirket belgesi zorunlu',
  PATRON: 'Tam KYC — şirket belgesi zorunlu',
  STANDART: 'Hafif KYC — belge opsiyonel',
  GENC_GIRISIMCI: 'Hafif KYC — belge opsiyonel',
};

type PolicyMap = Record<MembershipTier, Set<VerificationDocumentType>>;

export default function NbVerificationPolicies() {
  const [policies, setPolicies] = useState<TierDocumentPolicy[]>([]);
  const [draft, setDraft] = useState<PolicyMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<MembershipTier | null>(null);
  const [toast, setToast] = useState<{ msg: string; severity: 'success' | 'error' } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await nbAdminService.listTierDocPolicies();
      setPolicies(data);
      const map: PolicyMap = {} as PolicyMap;
      for (const tier of ALL_TIERS) {
        const found = data.find((p) => p.tier === tier);
        map[tier] = new Set(found?.requiredDocTypes ?? []);
      }
      setDraft(map);
    } catch {
      setError('Politikalar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }

  function toggleDoc(tier: MembershipTier, doc: VerificationDocumentType) {
    if (!draft) return;
    const next = new Set(draft[tier]);
    if (next.has(doc)) next.delete(doc);
    else next.add(doc);
    setDraft({ ...draft, [tier]: next });
  }

  async function save(tier: MembershipTier) {
    if (!draft) return;
    setSaving(tier);
    try {
      await nbAdminService.updateTierDocPolicy(tier, [...draft[tier]]);
      setToast({ msg: `${TIER_LABELS[tier]} politikası kaydedildi.`, severity: 'success' });
      await load();
    } catch {
      setToast({ msg: 'Kayıt başarısız.', severity: 'error' });
    } finally {
      setSaving(null);
    }
  }

  function isDirty(tier: MembershipTier): boolean {
    if (!draft) return false;
    const saved = new Set(policies.find((p) => p.tier === tier)?.requiredDocTypes ?? []);
    const current = draft[tier];
    if (saved.size !== current.size) return true;
    for (const d of current) if (!saved.has(d)) return true;
    return false;
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={6}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;
  }

  return (
    <Box p={3}>
      <Stack spacing={0.5} mb={3}>
        <Typography variant="h5" fontWeight={700}>
          KYC Belge Politikaları
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Her üyelik kademesi için zorunlu belgeler. Onay sırasında eksik belge varsa komite oyuna
          rağmen NEEDS_INFO'ya düşer.
        </Typography>
      </Stack>

      <Alert severity="info" sx={{ mb: 3 }}>
        Hafif KYC kademelerinde (Standart, Genç Girişimci) zorunlu belge bırakmak önerilmez —
        komite belgesiz onaylayabilir.
      </Alert>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell sx={{ fontWeight: 700, minWidth: 160 }}>Kademe</TableCell>
              {ALL_DOC_TYPES.map((dt) => (
                <TableCell key={dt} align="center" sx={{ fontWeight: 600, fontSize: 12 }}>
                  {DOC_TYPE_LABELS[dt] ?? dt}
                </TableCell>
              ))}
              <TableCell align="right" sx={{ minWidth: 120 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {ALL_TIERS.map((tier) => {
              const dirty = isDirty(tier);
              const saved = policies.find((p) => p.tier === tier);
              return (
                <TableRow
                  key={tier}
                  sx={{ '&:last-child td': { border: 0 }, bgcolor: dirty ? 'warning.50' : undefined }}
                >
                  <TableCell>
                    <Stack spacing={0.25}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2" fontWeight={600}>
                          {TIER_LABELS[tier]}
                        </Typography>
                        {dirty && (
                          <Chip label="Kaydedilmedi" size="small" color="warning" sx={{ fontSize: 10, height: 18 }} />
                        )}
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {TIER_DESCRIPTIONS[tier]}
                      </Typography>
                      {saved?.updatedAt && (
                        <Typography variant="caption" color="text.disabled">
                          Son güncelleme: {new Date(saved.updatedAt).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}
                        </Typography>
                      )}
                    </Stack>
                  </TableCell>
                  {ALL_DOC_TYPES.map((dt) => (
                    <TableCell key={dt} align="center" padding="checkbox">
                      <Tooltip
                        title={draft?.[tier].has(dt) ? 'Zorunlu — kaldır' : 'Zorunlu değil — ekle'}
                        placement="top"
                      >
                        <Checkbox
                          size="small"
                          checked={draft?.[tier].has(dt) ?? false}
                          onChange={() => toggleDoc(tier, dt)}
                          color="primary"
                        />
                      </Tooltip>
                    </TableCell>
                  ))}
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant={dirty ? 'contained' : 'outlined'}
                      color={dirty ? 'primary' : 'inherit'}
                      disabled={!dirty || saving === tier}
                      onClick={() => save(tier)}
                      startIcon={
                        saving === tier ? (
                          <CircularProgress size={16} color="inherit" />
                        ) : (
                          <SaveIcon />
                        )
                      }
                      sx={{ minWidth: 90 }}
                    >
                      Kaydet
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Stack mt={3} spacing={1}>
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          Belge açıklamaları
        </Typography>
        <FormGroup row sx={{ gap: 2 }}>
          {ALL_DOC_TYPES.map((dt) => (
            <FormControlLabel
              key={dt}
              control={<Box sx={{ display: 'none' }} />}
              label={
                <Typography variant="caption" color="text.secondary">
                  <b>{dt}</b> — {DOC_TYPE_LABELS[dt] ?? dt}
                </Typography>
              }
            />
          ))}
        </FormGroup>
      </Stack>

      <Snackbar
        open={!!toast}
        autoHideDuration={3500}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toast?.severity ?? 'info'} onClose={() => setToast(null)}>
          {toast?.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
