import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import {
  emailTemplateService,
  type EmailTemplateDef,
  type EmailPreviewResult,
} from '../../services/emailTemplateService';

/**
 * Hazır e-posta template'lerini elle gönderme ekranı.
 *
 * Kullanım: bir kullanıcıya hazır bir maili (welcome, payment-failed, member-renewed,
 * subscription-* …) elle yollamak — örn. yanlış adrese gitmiş bir maili düzeltilmiş
 * adrese tekrar göndermek. Değişken alanları seçilen template'in kataloğundan üretilir.
 *
 * Not: NartBusiness başvuru e-postaları buraya dahil değildir — onlar üye detay
 * ekranındaki "Mail Gönder" akışıyla (kayıttan otomatik) gönderilir.
 */
export default function ManualEmailSender() {
  const [templates, setTemplates] = useState<EmailTemplateDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [templateKey, setTemplateKey] = useState('');
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [vars, setVars] = useState<Record<string, string>>({});

  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const [preview, setPreview] = useState<EmailPreviewResult | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cat = await emailTemplateService.catalog();
        if (cancelled) return;
        setTemplates(cat);
      } catch (e: any) {
        if (!cancelled) setLoadError(e?.response?.data?.message ?? e?.message ?? 'Katalog yüklenemedi');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = useMemo(
    () => templates.find((t) => t.key === templateKey) ?? null,
    [templates, templateKey],
  );

  /** Template'i (verilen veya state'teki değişkenlerle) render edip önizler — GÖNDERMEZ. */
  const runPreview = async (
    key: string = templateKey,
    varsArg: Record<string, string> = vars,
  ) => {
    if (!key) return;
    setPreviewing(true);
    setPreviewError(null);
    try {
      const cleaned: Record<string, string> = {};
      Object.entries(varsArg).forEach(([k, v]) => {
        if ((v ?? '').trim()) cleaned[k] = v.trim();
      });
      const r = await emailTemplateService.preview({
        to: to.trim() || 'onizleme@nartgo.net',
        templateName: key,
        subject: subject.trim() || undefined,
        variables: cleaned,
      });
      setPreview(r);
    } catch (e: any) {
      setPreviewError(e?.response?.data?.message ?? e?.message ?? 'Önizleme alınamadı.');
    } finally {
      setPreviewing(false);
    }
  };

  const onPickTemplate = (key: string) => {
    setTemplateKey(key);
    setResult(null);
    setPreview(null);
    setPreviewError(null);
    const def = templates.find((t) => t.key === key);
    setSubject(def?.defaultSubject ?? '');
    // Yeni template'in değişkenlerini boş başlat.
    const next: Record<string, string> = {};
    def?.variables.forEach((v) => {
      next[v.name] = '';
    });
    setVars(next);
    // Seçer seçmez placeholder'larla önizleme üret (admin "ne içeriyor" görsün).
    void runPreview(key, {});
  };

  const missingRequired = useMemo(() => {
    if (!selected) return [];
    return selected.variables
      .filter((v) => v.required && !vars[v.name]?.trim())
      .map((v) => v.label);
  }, [selected, vars]);

  const canSend = !!selected && !!to.trim() && missingRequired.length === 0 && !sending;

  const handleSend = async () => {
    if (!selected) return;
    setSending(true);
    setResult(null);
    try {
      const cleaned: Record<string, string> = {};
      Object.entries(vars).forEach(([k, v]) => {
        if (v.trim()) cleaned[k] = v.trim();
      });
      const r = await emailTemplateService.send({
        to: to.trim(),
        templateName: selected.key,
        subject: subject.trim() || undefined,
        variables: cleaned,
      });
      setResult({ ok: true, text: `E-posta kuyruğa alındı: ${r.to}` });
    } catch (e: any) {
      setResult({
        ok: false,
        text: e?.response?.data?.message ?? e?.message ?? 'E-posta gönderilemedi.',
      });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <Box p={3} display="flex" justifyContent="center">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3} maxWidth={760} mx="auto">
      <Stack direction="row" spacing={1.5} alignItems="center" mb={0.5}>
        <EmailOutlinedIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>
          Hazır Mail Gönder
        </Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Hazır bir template'i elle bir adrese gönder. Yanlış adrese gitmiş bir maili
        düzeltilmiş adrese yeniden yollamak için idealdir. İçerik aşağıdaki alanlardan
        oluşturulur.
      </Typography>

      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Stack spacing={2.5}>
          <TextField
            select
            fullWidth
            label="Template"
            value={templateKey}
            onChange={(e) => onPickTemplate(e.target.value)}
            size="small"
          >
            <MenuItem value="" disabled>
              Template seç…
            </MenuItem>
            {templates.map((t) => (
              <MenuItem key={t.key} value={t.key}>
                {t.title}
              </MenuItem>
            ))}
          </TextField>

          {selected && (
            <>
              {/* Ne tür mail? — ürün + kategori + açıklama. Admin "NartGo mu,
                  NartBusiness mı / üyelik mi abonelik mi" sorusunu net görür. */}
              <Box
                sx={{
                  borderRadius: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'action.hover',
                  p: 1.5,
                }}
              >
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={selected.description ? 1 : 0}>
                  {selected.product && (
                    <Chip
                      size="small"
                      color={selected.product.toLowerCase().includes('business') ? 'secondary' : 'primary'}
                      label={selected.product}
                    />
                  )}
                  {selected.category && (
                    <Chip size="small" variant="outlined" label={selected.category} />
                  )}
                </Stack>
                {selected.description && (
                  <Typography variant="body2" color="text.secondary">
                    {selected.description}
                  </Typography>
                )}
              </Box>

              <TextField
                fullWidth
                required
                type="email"
                label="Gönderilecek adres"
                placeholder="ornek@eposta.com"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                size="small"
              />
              <TextField
                fullWidth
                label="Konu"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                size="small"
                helperText="Boş bırakırsan template'in varsayılan konusu kullanılır."
              />

              <Divider textAlign="left">
                <Typography variant="caption" color="text.secondary">
                  İçerik değişkenleri
                </Typography>
              </Divider>

              <Grid container spacing={2}>
                {selected.variables.map((v) => (
                  <Grid item xs={12} sm={6} key={v.name}>
                    <TextField
                      fullWidth
                      required={v.required}
                      label={v.label}
                      placeholder={v.placeholder}
                      value={vars[v.name] ?? ''}
                      onChange={(e) =>
                        setVars((prev) => ({ ...prev, [v.name]: e.target.value }))
                      }
                      size="small"
                    />
                  </Grid>
                ))}
              </Grid>

              {missingRequired.length > 0 && (
                <Alert severity="info" variant="outlined">
                  Zorunlu alan(lar): {missingRequired.join(', ')}
                </Alert>
              )}

              <Divider textAlign="left">
                <Typography variant="caption" color="text.secondary">
                  Önizleme
                </Typography>
              </Divider>

              <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
                <Typography variant="caption" color="text.secondary">
                  Gönderilecek mailin birebir görünümü. Boş alanlar örnek değerle dolar.
                </Typography>
                <Button
                  size="small"
                  startIcon={<VisibilityOutlinedIcon />}
                  onClick={() => runPreview()}
                  disabled={previewing}
                >
                  {previewing ? 'Hazırlanıyor…' : 'Önizlemeyi Yenile'}
                </Button>
              </Stack>

              {previewError && <Alert severity="warning">{previewError}</Alert>}

              {preview && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Konu
                  </Typography>
                  <Typography variant="body2" fontWeight={600} mb={1}>
                    {preview.subject}
                  </Typography>
                  <Box
                    component="iframe"
                    title="E-posta önizleme"
                    srcDoc={preview.html}
                    sandbox=""
                    sx={{
                      width: '100%',
                      height: 460,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1.5,
                      bgcolor: '#fff',
                    }}
                  />
                </Box>
              )}
            </>
          )}

          {result && (
            <Alert severity={result.ok ? 'success' : 'error'}>{result.text}</Alert>
          )}

          <Box display="flex" justifyContent="flex-end">
            <Button
              variant="contained"
              startIcon={<EmailOutlinedIcon />}
              disabled={!canSend}
              onClick={handleSend}
            >
              {sending ? 'Gönderiliyor…' : 'Gönder'}
            </Button>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}
