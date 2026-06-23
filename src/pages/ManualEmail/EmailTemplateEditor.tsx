import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  List,
  ListItemButton,
  ListSubheader,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import RestartAltOutlinedIcon from '@mui/icons-material/RestartAltOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import {
  emailTemplateService,
  type EmailTemplateDef,
  type EmailTemplateDetail,
} from '../../services/emailTemplateService';

/**
 * E-posta şablonu editörü.
 *
 * Şablonların varsayılan içeriği dosya-tabanlıdır; admin burada KONU ve HTML GÖVDE'yi
 * düzenler. Kaydedilen override DB'ye yazılır ve o şablonla giden TÜM e-postaları
 * (event-tetikli dahil) etkiler. "Orijinale Dön" override'ı silip dosya/katalog
 * varsayılanına döner. Önizleme, eksik değişkenleri placeholder ile doldurur.
 */
export default function EmailTemplateEditor() {
  const [templates, setTemplates] = useState<EmailTemplateDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedKey, setSelectedKey] = useState('');
  const [detail, setDetail] = useState<EmailTemplateDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState('');
  const [dirty, setDirty] = useState(false);

  const [previewHtml, setPreviewHtml] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ severity: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const cat = await emailTemplateService.catalog();
        setTemplates(cat);
      } catch (e: any) {
        setLoadError(e?.message ?? 'Şablon kataloğu yüklenemedi.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const grouped = useMemo(() => {
    const m = new Map<string, EmailTemplateDef[]>();
    for (const t of templates) {
      const p = t.product || 'Diğer';
      if (!m.has(p)) m.set(p, []);
      m.get(p)!.push(t);
    }
    return Array.from(m.entries());
  }, [templates]);

  const selectTemplate = async (key: string) => {
    if (dirty && !window.confirm('Kaydedilmemiş değişiklikler var. Başka şablona geçilsin mi?')) return;
    setSelectedKey(key);
    setDetailLoading(true);
    setMsg(null);
    setPreviewHtml('');
    try {
      const d = await emailTemplateService.getTemplate(key);
      setDetail(d);
      setSubject(d.effectiveSubject ?? '');
      setHtml(d.effectiveHtml ?? '');
      setDirty(false);
    } catch (e: any) {
      setMsg({ severity: 'error', text: e?.response?.data?.message ?? e?.message ?? 'Şablon yüklenemedi.' });
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const doPreview = async () => {
    if (!selectedKey) return;
    setPreviewLoading(true);
    setMsg(null);
    try {
      const r = await emailTemplateService.preview({
        to: 'preview@nartgo.net',
        templateName: selectedKey,
        subject,
        htmlContent: html,
        variables: {},
      });
      setPreviewHtml(r.html ?? '');
    } catch (e: any) {
      setMsg({ severity: 'error', text: e?.response?.data?.message ?? e?.message ?? 'Önizleme oluşturulamadı.' });
    } finally {
      setPreviewLoading(false);
    }
  };

  const doSave = async () => {
    if (!selectedKey) return;
    setSaving(true);
    setMsg(null);
    try {
      await emailTemplateService.saveOverride(selectedKey, { subject, htmlContent: html });
      setMsg({ severity: 'success', text: 'Şablon kaydedildi. Bu şablonla giden tüm e-postalar artık bu içeriği kullanır.' });
      setDirty(false);
      await selectTemplateSilent(selectedKey);
    } catch (e: any) {
      setMsg({ severity: 'error', text: e?.response?.data?.message ?? e?.message ?? 'Kaydedilemedi.' });
    } finally {
      setSaving(false);
    }
  };

  // Kaydet/revert sonrası onay diyaloğu olmadan yeniden yükle.
  const selectTemplateSilent = async (key: string) => {
    try {
      const d = await emailTemplateService.getTemplate(key);
      setDetail(d);
      setSubject(d.effectiveSubject ?? '');
      setHtml(d.effectiveHtml ?? '');
      setDirty(false);
    } catch {
      /* yut */
    }
  };

  const doRevert = async () => {
    if (!selectedKey || !detail?.hasOverride) return;
    if (!window.confirm('Bu şablon orijinal (varsayılan) içeriğine döndürülsün mü? Düzenlemeniz silinecek.')) return;
    setSaving(true);
    setMsg(null);
    try {
      await emailTemplateService.revertOverride(selectedKey);
      setMsg({ severity: 'info', text: 'Şablon orijinaline döndürüldü.' });
      setPreviewHtml('');
      await selectTemplateSilent(selectedKey);
    } catch (e: any) {
      setMsg({ severity: 'error', text: e?.response?.data?.message ?? e?.message ?? 'Orijinale dönülemedi.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
        <CircularProgress />
      </Box>
    );
  }
  if (loadError) {
    return <Alert severity="error" sx={{ m: 2 }}>{loadError}</Alert>;
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        E-posta Şablonları
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Şablonların konusunu ve HTML gövdesini düzenleyin. Kaydedilen değişiklik, o şablonla
        giden tüm e-postaları (otomatik olanlar dahil) etkiler. Değişkenler{' '}
        <code>{'${...}'}</code> / Thymeleaf <code>th:text</code> ile gelir; önizlemede
        örnek değerlerle gösterilir.
      </Typography>

      {msg && <Alert severity={msg.severity} sx={{ mb: 2 }} onClose={() => setMsg(null)}>{msg.text}</Alert>}

      <Grid container spacing={2}>
        {/* Sol: şablon listesi */}
        <Grid item xs={12} md={3}>
          <Paper variant="outlined" sx={{ maxHeight: '72vh', overflow: 'auto' }}>
            <List dense disablePadding>
              {grouped.map(([product, defs]) => (
                <Box key={product}>
                  <ListSubheader sx={{ fontWeight: 700 }}>{product}</ListSubheader>
                  {defs.map((t) => (
                    <ListItemButton
                      key={t.key}
                      selected={t.key === selectedKey}
                      onClick={() => selectTemplate(t.key)}
                    >
                      <Stack sx={{ width: '100%' }}>
                        <Typography variant="body2" fontWeight={t.key === selectedKey ? 700 : 500}>
                          {t.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {t.category}
                        </Typography>
                      </Stack>
                    </ListItemButton>
                  ))}
                </Box>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Sağ: editör + önizleme */}
        <Grid item xs={12} md={9}>
          {!selectedKey ? (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
              Düzenlemek için soldan bir şablon seçin.
            </Paper>
          ) : detailLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
              <CircularProgress />
            </Box>
          ) : detail ? (
            <Stack spacing={2}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }} flexWrap="wrap">
                  <Typography variant="h6" fontWeight={700}>{detail.title}</Typography>
                  <Chip size="small" label={detail.product} />
                  <Chip size="small" variant="outlined" label={detail.category} />
                  {detail.hasOverride ? (
                    <Chip size="small" color="warning" label="Düzenlendi" />
                  ) : (
                    <Chip size="small" color="default" label="Varsayılan" />
                  )}
                  <Box sx={{ flex: 1 }} />
                  {detail.updatedBy && (
                    <Typography variant="caption" color="text.secondary">
                      Son düzenleyen: {detail.updatedBy}
                    </Typography>
                  )}
                </Stack>
                {detail.description && (
                  <Typography variant="body2" color="text.secondary">{detail.description}</Typography>
                )}

                {detail.variables.length > 0 && (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    <Typography variant="caption" color="text.secondary">Kullanılabilir değişkenler:</Typography>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                      {detail.variables.map((v) => (
                        <Tooltip key={v.name} title={`${v.label}${v.required ? ' (zorunlu)' : ''}`}>
                          <Chip size="small" variant="outlined" label={v.name} />
                        </Tooltip>
                      ))}
                    </Stack>
                  </>
                )}
              </Paper>

              <Paper variant="outlined" sx={{ p: 2 }}>
                <TextField
                  label="Konu"
                  value={subject}
                  onChange={(e) => { setSubject(e.target.value); setDirty(true); }}
                  fullWidth
                  size="small"
                  sx={{ mb: 2 }}
                />
                <TextField
                  label="HTML Gövde"
                  value={html}
                  onChange={(e) => { setHtml(e.target.value); setDirty(true); }}
                  fullWidth
                  multiline
                  minRows={14}
                  maxRows={28}
                  InputProps={{ sx: { fontFamily: 'monospace', fontSize: 13 } }}
                />
                <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
                  <Button
                    variant="outlined"
                    startIcon={<VisibilityOutlinedIcon />}
                    onClick={doPreview}
                    disabled={previewLoading}
                  >
                    {previewLoading ? 'Hazırlanıyor…' : 'Önizle'}
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<SaveOutlinedIcon />}
                    onClick={doSave}
                    disabled={saving || !dirty}
                  >
                    {saving ? 'Kaydediliyor…' : 'Kaydet'}
                  </Button>
                  <Box sx={{ flex: 1 }} />
                  <Button
                    variant="text"
                    color="warning"
                    startIcon={<RestartAltOutlinedIcon />}
                    onClick={doRevert}
                    disabled={saving || !detail.hasOverride}
                  >
                    Orijinale Dön
                  </Button>
                </Stack>
              </Paper>

              {previewHtml && (
                <Paper variant="outlined" sx={{ p: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ pl: 1 }}>
                    Önizleme (örnek değerlerle)
                  </Typography>
                  <Box
                    component="iframe"
                    title="email-preview"
                    srcDoc={previewHtml}
                    sx={{ width: '100%', height: '60vh', border: 0, mt: 0.5 }}
                  />
                </Paper>
              )}
            </Stack>
          ) : null}
        </Grid>
      </Grid>
    </Box>
  );
}
