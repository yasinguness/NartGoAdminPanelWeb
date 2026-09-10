import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import PageContainer from '../../components/Page/PageContainer';
import PageHeader from '../../components/Page/PageHeader';
import {
  emailTemplateService,
  type EmailTemplateDef,
  type EmailPreviewResult,
} from '../../services/emailTemplateService';

/**
 * Hazır e-posta şablonlarını elle gönderme ekranı.
 *
 * İki aşamalı: önce şablon galerisi (ara + süz + kart seç), sonra gönderim
 * formu ve yanında canlı önizleme. Tek bir açılır liste, katalog 30 şablonu
 * geçtiğinde okunmaz hâle gelmişti; kartlar hangi mailin ne işe yaradığını
 * seçmeden önce gösteriyor.
 *
 * Not: NartBusiness başvuru e-postaları buraya dahil değildir; onlar üye detay
 * ekranındaki "Mail Gönder" akışıyla, değişkenleri kayıttan kurularak gönderilir.
 */
export default function ManualEmailSender() {
  const [templates, setTemplates] = useState<EmailTemplateDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Galeri süzgeçleri
  const [search, setSearch] = useState('');
  const [product, setProduct] = useState<string>('ALL');
  const [category, setCategory] = useState<string>('ALL');

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

  const products = useMemo(() => {
    const set = new Set<string>();
    templates.forEach((t) => t.product && set.add(t.product));
    return Array.from(set).sort();
  }, [templates]);

  /** Kategori listesi seçili üründen türer: NartGo seçiliyken NB kategorileri boş sonuç verirdi. */
  const categories = useMemo(() => {
    const set = new Set<string>();
    templates
      .filter((t) => product === 'ALL' || t.product === product)
      .forEach((t) => t.category && set.add(t.category));
    return Array.from(set).sort();
  }, [templates, product]);

  const visible = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('tr');
    return templates.filter((t) => {
      if (product !== 'ALL' && t.product !== product) return false;
      if (category !== 'ALL' && t.category !== category) return false;
      if (!q) return true;
      const haystack = [t.title, t.description, t.defaultSubject, t.key]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('tr');
      return haystack.includes(q);
    });
  }, [templates, product, category, search]);

  /** Şablonu verilen değişkenlerle render edip önizler — GÖNDERMEZ. */
  const runPreview = useCallback(
    async (key: string, varsArg: Record<string, string>, subjectArg: string) => {
      if (!key) return;
      setPreviewing(true);
      setPreviewError(null);
      try {
        const cleaned: Record<string, string> = {};
        Object.entries(varsArg).forEach(([k, v]) => {
          if ((v ?? '').trim()) cleaned[k] = v.trim();
        });
        const r = await emailTemplateService.preview({
          to: 'onizleme@nartgo.net',
          templateName: key,
          subject: subjectArg.trim() || undefined,
          variables: cleaned,
        });
        setPreview(r);
      } catch (e: any) {
        setPreviewError(e?.response?.data?.message ?? e?.message ?? 'Önizleme alınamadı.');
      } finally {
        setPreviewing(false);
      }
    },
    [],
  );

  // Değişken yazdıkça önizleme kendi kendine tazelensin. Her tuşta sunucuya
  // gitmemek için gecikmeli: admin yazmayı bırakınca bir istek gider.
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!templateKey) return;
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(() => {
      void runPreview(templateKey, vars, subject);
    }, 700);
    return () => {
      if (previewTimer.current) clearTimeout(previewTimer.current);
    };
  }, [templateKey, vars, subject, runPreview]);

  const onPickTemplate = (def: EmailTemplateDef) => {
    setTemplateKey(def.key);
    setResult(null);
    setPreview(null);
    setPreviewError(null);
    setSubject(def.defaultSubject ?? '');
    const next: Record<string, string> = {};
    def.variables.forEach((v) => {
      next[v.name] = '';
    });
    setVars(next);
  };

  const backToGallery = () => {
    setTemplateKey('');
    setPreview(null);
    setPreviewError(null);
    setResult(null);
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
      <PageContainer>
        <Box display="flex" justifyContent="center" p={6}>
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth={selected ? 1400 : 1200}>
      <PageHeader
        title="Hazır Mail Gönder"
        subtitle={
          selected
            ? 'Alanları doldur, sağdaki önizlemede kontrol et, gönder.'
            : 'Göndermek istediğin maili seç. Kartlar mailin ne işe yaradığını gösterir.'
        }
        showBackButton={!!selected}
        onBack={selected ? backToGallery : undefined}
      />

      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      )}

      {!selected ? (
        <TemplateGallery
          templates={visible}
          total={templates.length}
          search={search}
          onSearch={setSearch}
          product={product}
          onProduct={(p) => {
            setProduct(p);
            setCategory('ALL');
          }}
          products={products}
          category={category}
          onCategory={setCategory}
          categories={categories}
          onPick={onPickTemplate}
        />
      ) : (
        <Box
          sx={{
            display: 'grid',
            gap: 3,
            alignItems: 'start',
            gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) minmax(0, 1fr)' },
          }}
        >
          {/* Sol: form */}
          <Stack spacing={2.5}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                <Typography variant="subtitle1" fontWeight={700} sx={{ mr: 0.5 }}>
                  {selected.title}
                </Typography>
                {selected.product && (
                  <Chip
                    size="small"
                    color={selected.product.toLowerCase().includes('business') ? 'secondary' : 'primary'}
                    label={selected.product}
                  />
                )}
                {selected.category && <Chip size="small" variant="outlined" label={selected.category} />}
              </Stack>
              {selected.description && (
                <Typography variant="body2" color="text.secondary" mt={1}>
                  {selected.description}
                </Typography>
              )}
            </Paper>

            <Paper variant="outlined" sx={{ p: 3 }}>
              <Stack spacing={2.5}>
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
                  helperText="Boş bırakırsan şablonun varsayılan konusu kullanılır."
                />

                {selected.variables.length > 0 && (
                  <>
                    <Divider textAlign="left">
                      <Typography variant="caption" color="text.secondary">
                        İçerik alanları
                      </Typography>
                    </Divider>

                    <Box
                      sx={{
                        display: 'grid',
                        gap: 2,
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                      }}
                    >
                      {selected.variables.map((v) => (
                        <TextField
                          key={v.name}
                          fullWidth
                          required={v.required}
                          label={v.label}
                          placeholder={v.placeholder}
                          value={vars[v.name] ?? ''}
                          onChange={(e) => setVars((prev) => ({ ...prev, [v.name]: e.target.value }))}
                          size="small"
                        />
                      ))}
                    </Box>
                  </>
                )}

                {missingRequired.length > 0 && (
                  <Alert severity="info" variant="outlined">
                    Şu alanlar zorunlu: {missingRequired.join(', ')}. Boş bırakılırsa maildeki
                    bağlantı ve metinler eksik gider.
                  </Alert>
                )}

                {result && <Alert severity={result.ok ? 'success' : 'error'}>{result.text}</Alert>}

                <Box display="flex" justifyContent="flex-end">
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<SendOutlinedIcon />}
                    disabled={!canSend}
                    onClick={handleSend}
                  >
                    {sending ? 'Gönderiliyor…' : 'Gönder'}
                  </Button>
                </Box>
              </Stack>
            </Paper>
          </Stack>

          {/* Sağ: önizleme. Uzun formda ekranla birlikte kayar. */}
          <Box sx={{ position: { lg: 'sticky' }, top: { lg: 16 } }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="subtitle2" fontWeight={700}>
                    Önizleme
                  </Typography>
                  {previewing && <CircularProgress size={14} />}
                </Stack>
                <Tooltip title="Önizlemeyi yeniden oluştur" arrow>
                  <span>
                    <Button
                      size="small"
                      startIcon={<RefreshIcon />}
                      onClick={() => void runPreview(templateKey, vars, subject)}
                      disabled={previewing}
                    >
                      Yenile
                    </Button>
                  </span>
                </Tooltip>
              </Stack>

              <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
                Gönderilecek mailin birebir görünümü. Doldurmadığın alanlar örnek değerle
                gösterilir, gönderimde doldurulmaz.
              </Typography>

              {previewError && (
                <Alert severity="warning" sx={{ mb: 1.5 }}>
                  {previewError}
                </Alert>
              )}

              {preview ? (
                <>
                  <Box
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1.5,
                      p: 1.25,
                      mb: 1.5,
                      bgcolor: 'action.hover',
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      Konu
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {preview.subject}
                    </Typography>
                  </Box>
                  <Box
                    component="iframe"
                    title="E-posta önizleme"
                    srcDoc={preview.html}
                    sandbox=""
                    sx={{
                      width: '100%',
                      height: { xs: 420, lg: 620 },
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1.5,
                      bgcolor: '#fff',
                    }}
                  />
                </>
              ) : (
                <Box
                  sx={{
                    height: 320,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px dashed',
                    borderColor: 'divider',
                    borderRadius: 1.5,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Önizleme hazırlanıyor…
                  </Typography>
                </Box>
              )}
            </Paper>
          </Box>
        </Box>
      )}
    </PageContainer>
  );
}

/** Şablon galerisi: arama + ürün/kategori süzgeci + kart ızgarası. */
function TemplateGallery({
  templates,
  total,
  search,
  onSearch,
  product,
  onProduct,
  products,
  category,
  onCategory,
  categories,
  onPick,
}: {
  templates: EmailTemplateDef[];
  total: number;
  search: string;
  onSearch: (v: string) => void;
  product: string;
  onProduct: (v: string) => void;
  products: string[];
  category: string;
  onCategory: (v: string) => void;
  categories: string[];
  onPick: (def: EmailTemplateDef) => void;
}) {
  return (
    <Stack spacing={2.5}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        alignItems={{ md: 'center' }}
        justifyContent="space-between"
      >
        <TextField
          size="small"
          placeholder="Şablon ara: başlık, konu ya da açıklama…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          sx={{ flexGrow: 1, maxWidth: { md: 420 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        {products.length > 1 && (
          <ToggleButtonGroup
            size="small"
            exclusive
            value={product}
            onChange={(_, v) => v && onProduct(v)}
          >
            <ToggleButton value="ALL">Tümü</ToggleButton>
            {products.map((p) => (
              <ToggleButton key={p} value={p}>
                {p}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        )}
      </Stack>

      {categories.length > 1 && (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip
            label="Tüm kategoriler"
            size="small"
            color={category === 'ALL' ? 'primary' : 'default'}
            variant={category === 'ALL' ? 'filled' : 'outlined'}
            onClick={() => onCategory('ALL')}
          />
          {categories.map((c) => (
            <Chip
              key={c}
              label={c}
              size="small"
              color={category === c ? 'primary' : 'default'}
              variant={category === c ? 'filled' : 'outlined'}
              onClick={() => onCategory(c)}
            />
          ))}
        </Stack>
      )}

      <Typography variant="caption" color="text.secondary">
        {templates.length === total
          ? `${total} şablon`
          : `${templates.length} / ${total} şablon`}
      </Typography>

      {templates.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 6, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Aramanla eşleşen şablon yok.
          </Typography>
        </Paper>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          }}
        >
          {templates.map((t) => (
            <TemplateCard key={t.key} def={t} onPick={() => onPick(t)} />
          ))}
        </Box>
      )}
    </Stack>
  );
}

function TemplateCard({ def, onPick }: { def: EmailTemplateDef; onPick: () => void }) {
  const isBusiness = (def.product ?? '').toLowerCase().includes('business');
  const requiredCount = def.variables.filter((v) => v.required).length;

  return (
    <Paper
      variant="outlined"
      onClick={onPick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onPick();
        }
      }}
      sx={{
        p: 2,
        cursor: 'pointer',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        // Ürünü renkle ayır: NartGo mu NartBusiness mı, karta bakar bakmaz belli olsun.
        borderLeft: '3px solid',
        borderLeftColor: isBusiness ? 'secondary.main' : 'primary.main',
        transition: 'box-shadow 120ms, border-color 120ms, transform 120ms',
        '&:hover': {
          boxShadow: 3,
          borderColor: isBusiness ? 'secondary.main' : 'primary.main',
          borderLeftColor: isBusiness ? 'secondary.main' : 'primary.main',
          transform: 'translateY(-2px)',
        },
        '&:focus-visible': {
          outline: '2px solid',
          outlineColor: 'primary.main',
          outlineOffset: 2,
        },
      }}
    >
      <Typography variant="subtitle2" fontWeight={700} gutterBottom>
        {def.title}
      </Typography>

      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap mb={1}>
        {def.product && (
          <Chip size="small" color={isBusiness ? 'secondary' : 'primary'} label={def.product} />
        )}
        {def.category && <Chip size="small" variant="outlined" label={def.category} />}
      </Stack>

      {def.description && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            // Kartlar aynı yükseklikte dursun diye açıklama üç satırda kesilir.
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            mb: 1.5,
          }}
        >
          {def.description}
        </Typography>
      )}

      <Box flexGrow={1} />

      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="caption" color="text.disabled">
          {def.variables.length === 0
            ? 'Alan yok'
            : `${def.variables.length} alan${requiredCount > 0 ? ` · ${requiredCount} zorunlu` : ''}`}
        </Typography>
        <EmailOutlinedIcon fontSize="small" color="action" />
      </Stack>
    </Paper>
  );
}
