import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  InputAdornment,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import SearchIcon from '@mui/icons-material/Search';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { nb, nbRadius } from '../../theme/nbBrand';
import {
  nbDividerLine,
  nbInput,
  nbLabel,
  nbMono,
  nbPill,
  nbPrimaryBtn,
  nbQuietBtn,
  nbSelectedRow,
} from '../../components/nartbusiness/ui';
import { emailTemplateService } from '../../services/emailTemplateService';
import type { EmailTemplateDef } from '../../services/emailTemplateService';
import { nbAdminService } from '../../services/nartbusiness/nbAdminService';
import { nbErrorMessage } from '../../services/nartbusiness/nbErrorMessage';

/**
 * Üyeye hazır e-posta gönderme — şablon seç, önizle, gönder.
 *
 * Üye detayında eskiden yalnız dört şablon vardı ve önizleme yoktu: admin
 * mailin ne diyeceğini görmeden gönderiyordu. Burada katalogun tamamı
 * seçilebilir ve gövde gönderilmeden önce gerçek render ile görünür.
 *
 * İki şey bilinçli olarak sunucudan geliyor:
 *
 * 1. **Değişkenler.** Şirket adı, başvuru no, kademe, ücret, tarihler ve derin
 *    bağlantılar üyeden türetilip hazır gelir. Admin'in elle yazması yazım
 *    hatasını alıcıya taşır ve biçimi otomatik gönderimlerden ayırır.
 * 2. **Engel kararı.** Kimlik bilgisi taşıyan şablonlar (geçici şifre, şifre
 *    belirleme bağlantısı) elle gönderilemez. Kararı katalog veriyor; burada
 *    yalnız gösteriliyor. Politikayı istemcide tekrarlamak, iki yüzeyin
 *    zamanla ayrışması demekti.
 */

interface Props {
  open: boolean;
  onClose: () => void;
  memberId: string;
  memberName?: string | null;
  /**
   * Açılışta seçili gelecek şablon. Üye detayındaki kısayollar ("Eksik bilgi
   * iste", "Hatırlat") niyeti taşıyor; kullanıcıyı listeye düşürüp aramaya
   * zorlamak o niyeti kaybettirirdi.
   */
  initialTemplateKey?: string | null;
  /** Gönderim başarılı olduğunda üst ekranın bildirim göstermesi için. */
  onSent?: (message: string) => void;
}

interface MemberEmailContext {
  to: string;
  variables: Record<string, string>;
}

const PREVIEW_DEBOUNCE_MS = 450;

export default function NbMemberEmailDialog({
  open,
  onClose,
  memberId,
  memberName,
  initialTemplateKey,
  onSent,
}: Props) {
  const [catalog, setCatalog] = useState<EmailTemplateDef[]>([]);
  const [ctx, setCtx] = useState<MemberEmailContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  /** Sunucudan hazır gelen alanlar — "otomatik dolduruldu" rozetini bunlar alır. */
  const [prefilled, setPrefilled] = useState<Set<string>>(new Set());

  const [useOtherAddress, setUseOtherAddress] = useState(false);
  const [otherAddress, setOtherAddress] = useState('');

  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  /* ── Yükleme ─────────────────────────────────────────────────────────── */

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    Promise.all([
      emailTemplateService.catalog(),
      nbAdminService.getMemberEmailContext(memberId),
    ])
      .then(([defs, context]) => {
        if (cancelled) return;
        setCatalog(defs);
        setCtx(context);
      })
      .catch((e) => {
        if (!cancelled) setLoadError(nbErrorMessage(e, 'Şablonlar yüklenemedi.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, memberId]);

  /**
   * Kısayolla açıldıysa şablonu hazır seç. Katalog VE üye bağlamı birlikte
   * gelmeden çalışmamalı: bağlam yoksa alanlar boş dolar ve admin hazır
   * gelmesi gereken değerleri elle yazmak zorunda kalır.
   */
  useEffect(() => {
    if (!open || !initialTemplateKey || !ctx || catalog.length === 0) return;
    if (selectedKey) return;
    const def = catalog.find((t) => t.key === initialTemplateKey);
    if (def && !def.manualSendBlockedReason) selectTemplate(def);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialTemplateKey, ctx, catalog]);

  /** Diyalog kapanınca seçim sıfırlanır; bir sonraki üyeye eski şablon taşınmasın. */
  useEffect(() => {
    if (open) return;
    setSelectedKey(null);
    setSearch('');
    setPreviewHtml(null);
    setSendError(null);
    setUseOtherAddress(false);
    setOtherAddress('');
  }, [open]);

  /* ── Türetilmiş liste ────────────────────────────────────────────────── */

  // NartBusiness şablonları önce: bu ekran bir NB üyesinin detayı, NartGo
  // şablonları burada istisna. Gizlenmiyorlar çünkü bazı gönderimler
  // (duyuru, sistem bakımı) ürün fark etmeksizin geçerli.
  const grouped = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('tr');
    const visible = catalog.filter(
      (t) =>
        !q ||
        [t.title, t.description, t.category, t.key]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase('tr')
          .includes(q),
    );
    const order = (t: EmailTemplateDef) => (t.product === 'NartBusiness' ? 0 : 1);
    const sorted = [...visible].sort(
      (a, b) =>
        order(a) - order(b) ||
        (a.category ?? '').localeCompare(b.category ?? '', 'tr') ||
        a.title.localeCompare(b.title, 'tr'),
    );
    const out: { heading: string; items: EmailTemplateDef[] }[] = [];
    for (const t of sorted) {
      const heading = `${t.product ?? '—'} · ${t.category ?? '—'}`;
      const last = out[out.length - 1];
      if (last && last.heading === heading) last.items.push(t);
      else out.push({ heading, items: [t] });
    }
    return out;
  }, [catalog, search]);

  const selected = useMemo(
    () => catalog.find((t) => t.key === selectedKey) ?? null,
    [catalog, selectedKey],
  );
  const blockedReason = selected?.manualSendBlockedReason ?? null;

  const missingRequired = useMemo(() => {
    if (!selected) return [];
    return selected.variables
      .filter((v) => v.required && !(values[v.name] ?? '').trim())
      .map((v) => v.label);
  }, [selected, values]);

  const recipient = useOtherAddress ? otherAddress.trim() : (ctx?.to ?? '');

  /* ── Şablon seçimi: değişkenleri üyeden doldur ───────────────────────── */

  const selectTemplate = useCallback(
    (def: EmailTemplateDef) => {
      setSelectedKey(def.key);
      setSubject(def.defaultSubject ?? '');
      setSendError(null);
      setPreviewError(null);

      const source = ctx?.variables ?? {};
      const next: Record<string, string> = {};
      const filled = new Set<string>();
      for (const v of def.variables) {
        const value = source[v.name];
        if (value != null && String(value).trim()) {
          next[v.name] = String(value);
          filled.add(v.name);
        } else {
          next[v.name] = '';
        }
      }
      setValues(next);
      setPrefilled(filled);
    },
    [ctx],
  );

  /* ── Önizleme ────────────────────────────────────────────────────────── */

  const previewTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!selected) {
      setPreviewHtml(null);
      return;
    }
    if (previewTimer.current) window.clearTimeout(previewTimer.current);
    // Her tuş vuruşunda sunucuya gitmemek için bekletiliyor; önizleme gerçek
    // render olduğu için istemcide taklit edilemiyor (override'lar sunucuda).
    previewTimer.current = window.setTimeout(() => {
      setPreviewBusy(true);
      emailTemplateService
        .preview({ templateName: selected.key, subject, variables: values, to: recipient })
        .then((res) => {
          setPreviewHtml(res.html);
          setPreviewError(null);
        })
        .catch((e) => setPreviewError(nbErrorMessage(e, 'Önizleme oluşturulamadı.')))
        .finally(() => setPreviewBusy(false));
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      if (previewTimer.current) window.clearTimeout(previewTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.key, subject, values]);

  /* ── Gönderim ────────────────────────────────────────────────────────── */

  const send = useCallback(async () => {
    if (!selected || !recipient) return;
    setSending(true);
    setSendError(null);
    try {
      await emailTemplateService.send({
        to: recipient,
        templateName: selected.key,
        subject: subject.trim() || undefined,
        variables: values,
      });
      onSent?.(`"${selected.title}" e-postası gönderildi: ${recipient}`);
      onClose();
    } catch (e) {
      setSendError(nbErrorMessage(e, 'E-posta gönderilemedi.'));
    } finally {
      setSending(false);
    }
  }, [selected, recipient, subject, values, onSent, onClose]);

  const canSend =
    !!selected && !blockedReason && !!recipient && missingRequired.length === 0 && !sending;

  /* ── Görünüm ─────────────────────────────────────────────────────────── */

  return (
    <Dialog open={open} onClose={() => !sending && onClose()} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Typography component="div" sx={{ fontSize: 17, fontWeight: 600, color: nb.navy }}>
          E-posta Gönder
        </Typography>
        <Typography component="div" sx={{ fontSize: 12.5, color: nb.textMuted, mt: 0.25 }}>
          {memberName ? `${memberName} · ` : ''}
          {ctx?.to || 'adres bulunamadı'}
        </Typography>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={26} />
          </Box>
        ) : loadError ? (
          <Alert severity="error" sx={{ m: 3 }}>
            {loadError}
          </Alert>
        ) : (
          <Stack direction={{ xs: 'column', md: 'row' }} sx={{ minHeight: 520 }}>
            {/* ── Sol: şablon listesi ──────────────────────────────────── */}
            <Box
              sx={{
                width: { xs: '100%', md: 300 },
                flexShrink: 0,
                borderRight: { md: nbDividerLine },
                borderBottom: { xs: nbDividerLine, md: 'none' },
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Box sx={{ p: 1.5, borderBottom: nbDividerLine }}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Şablon ara…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  sx={nbInput}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ fontSize: 17, color: nb.textFaint }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>

              <Box sx={{ overflowY: 'auto', maxHeight: { md: 470 }, flexGrow: 1 }}>
                {grouped.map((group) => (
                  <Box key={group.heading}>
                    <Typography
                      sx={{ ...nbLabel, px: 1.75, pt: 1.75, pb: 0.75, display: 'block', color: nb.textFaint }}
                    >
                      {group.heading}
                    </Typography>
                    {group.items.map((t) => {
                      const locked = !!t.manualSendBlockedReason;
                      const active = t.key === selectedKey;
                      const row = (
                        <Box
                          key={t.key}
                          onClick={() => !locked && selectTemplate(t)}
                          sx={{
                            px: 1.75,
                            py: 1.25,
                            cursor: locked ? 'not-allowed' : 'pointer',
                            opacity: locked ? 0.45 : 1,
                            borderBottom: nbDividerLine,
                            ...(nbSelectedRow(active) as object),
                          }}
                        >
                          <Stack direction="row" alignItems="center" spacing={0.75}>
                            {locked && <LockOutlinedIcon sx={{ fontSize: 14, color: nb.textFaint }} />}
                            <Typography sx={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.35 }}>
                              {t.title}
                            </Typography>
                          </Stack>
                          {t.description && (
                            <Typography
                              sx={{
                                fontSize: 11,
                                color: nb.textFaint,
                                mt: 0.35,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              {t.description}
                            </Typography>
                          )}
                        </Box>
                      );
                      return locked ? (
                        <Tooltip key={t.key} title={t.manualSendBlockedReason ?? ''} arrow placement="right">
                          <Box>{row}</Box>
                        </Tooltip>
                      ) : (
                        row
                      );
                    })}
                  </Box>
                ))}
                {grouped.length === 0 && (
                  <Typography sx={{ p: 3, fontSize: 12.5, color: nb.textMuted, textAlign: 'center' }}>
                    Aramayla eşleşen şablon yok.
                  </Typography>
                )}
              </Box>
            </Box>

            {/* ── Sağ: alanlar + önizleme ──────────────────────────────── */}
            <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              {!selected ? (
                <Box
                  sx={{
                    flexGrow: 1,
                    display: 'grid',
                    placeItems: 'center',
                    p: 4,
                    textAlign: 'center',
                  }}
                >
                  <Box>
                    <Typography sx={{ fontSize: 14, fontWeight: 600, color: nb.navy }}>
                      Soldan bir şablon seçin
                    </Typography>
                    <Typography sx={{ fontSize: 12.5, color: nb.textMuted, mt: 0.75, maxWidth: 340 }}>
                      Üyeye ait bilgiler otomatik doldurulur. Gövdeyi göndermeden önce
                      burada olduğu gibi görürsünüz.
                    </Typography>
                  </Box>
                </Box>
              ) : (
                <Stack sx={{ flexGrow: 1, minHeight: 0 }}>
                  <Box sx={{ p: 2, borderBottom: nbDividerLine }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 600, color: nb.navy }}>
                      {selected.title}
                    </Typography>
                    <Typography sx={{ ...nbMono, fontSize: 11, color: nb.textFaint, mt: 0.25 }}>
                      {selected.key}
                    </Typography>

                    {blockedReason && (
                      <Alert severity="warning" sx={{ mt: 1.5, fontSize: 12.5 }}>
                        {blockedReason}
                        {selected.key === 'nb-set-password.html' && (
                          <>
                            {' '}
                            Bunun yerine üye detayındaki <strong>Şifre belirleme e-postası
                            gönder</strong> işlemini kullanın; gerçek bir bağlantı üretir.
                          </>
                        )}
                      </Alert>
                    )}

                    <TextField
                      size="small"
                      fullWidth
                      label="Konu"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      sx={{ ...nbInput, mt: 1.5 }}
                      helperText="Boş bırakılırsa şablonun kendi konusu kullanılır."
                    />

                    {/* Alıcı: varsayılan üyenin adresi. Başka adres bilinçli bir
                        eylem olsun diye anahtarın arkasında; kazara test
                        adresine gitmesin. */}
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1.5 }}>
                      <Switch
                        size="small"
                        checked={useOtherAddress}
                        onChange={(e) => setUseOtherAddress(e.target.checked)}
                      />
                      <Typography sx={{ fontSize: 12.5, color: nb.textMuted }}>
                        Başka bir adrese gönder
                      </Typography>
                    </Stack>
                    {useOtherAddress && (
                      <TextField
                        size="small"
                        fullWidth
                        label="Alıcı adresi"
                        value={otherAddress}
                        onChange={(e) => setOtherAddress(e.target.value)}
                        sx={{ ...nbInput, mt: 1 }}
                        helperText="Üyenin kayıtlı adresi değişmez; bu yalnız tek seferlik gönderimdir."
                      />
                    )}
                  </Box>

                  {selected.variables.length > 0 && (
                    <Box sx={{ p: 2, borderBottom: nbDividerLine }}>
                      <Typography sx={{ ...nbLabel, display: 'block', mb: 1.25 }}>
                        İÇERİK ALANLARI
                      </Typography>
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                          gap: 1.5,
                        }}
                      >
                        {selected.variables.map((v) => {
                          const auto = prefilled.has(v.name);
                          const empty = !(values[v.name] ?? '').trim();
                          return (
                            <TextField
                              key={v.name}
                              size="small"
                              label={v.label}
                              required={v.required}
                              error={v.required && empty}
                              value={values[v.name] ?? ''}
                              onChange={(e) =>
                                setValues((prev) => ({ ...prev, [v.name]: e.target.value }))
                              }
                              placeholder={v.placeholder}
                              sx={nbInput}
                              helperText={
                                auto ? (
                                  <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4 }}>
                                    <AutoAwesomeIcon sx={{ fontSize: 12 }} />
                                    üyeden dolduruldu
                                  </Box>
                                ) : v.required && empty ? (
                                  'Bu alan zorunlu'
                                ) : (
                                  ' '
                                )
                              }
                            />
                          );
                        })}
                      </Box>
                    </Box>
                  )}

                  {/* ── Önizleme ──────────────────────────────────────── */}
                  <Box sx={{ flexGrow: 1, minHeight: 300, display: 'flex', flexDirection: 'column' }}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      sx={{ px: 2, py: 1.25, borderBottom: nbDividerLine }}
                    >
                      <Typography sx={{ ...nbLabel, display: 'block' }}>ÖNİZLEME</Typography>
                      {previewBusy && <CircularProgress size={13} />}
                      <Box sx={{ flexGrow: 1 }} />
                      <Box component="span" sx={nbPill('info')}>
                        gerçek render
                      </Box>
                    </Stack>

                    {previewError ? (
                      <Alert severity="error" sx={{ m: 2, fontSize: 12.5 }}>
                        {previewError}
                      </Alert>
                    ) : (
                      <Box sx={{ flexGrow: 1, bgcolor: nb.bg, p: 1.5, minHeight: 280 }}>
                        <Box
                          component="iframe"
                          title="E-posta önizlemesi"
                          // sandbox boş: önizleme yabancı HTML değil ama script
                          // çalıştırmasına da gerek yok; kapalı tutmak ucuz.
                          sandbox=""
                          srcDoc={previewHtml ?? ''}
                          sx={{
                            width: '100%',
                            height: '100%',
                            minHeight: 280,
                            border: `1px solid ${nb.border}`,
                            borderRadius: `${nbRadius.panel}px`,
                            bgcolor: '#fff',
                            display: 'block',
                          }}
                        />
                      </Box>
                    )}
                  </Box>
                </Stack>
              )}
            </Box>
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2, py: 1.5, gap: 1 }}>
        {sendError && (
          <Typography sx={{ fontSize: 12.5, color: nb.red, flexGrow: 1 }}>{sendError}</Typography>
        )}
        {!sendError && missingRequired.length > 0 && selected && !blockedReason && (
          <Typography sx={{ fontSize: 12.5, color: nb.textMuted, flexGrow: 1 }}>
            Doldurulması gereken: {missingRequired.join(', ')}
          </Typography>
        )}
        {!sendError && missingRequired.length === 0 && <Box sx={{ flexGrow: 1 }} />}

        <Button onClick={onClose} disabled={sending} sx={nbQuietBtn}>
          Vazgeç
        </Button>
        <Button onClick={() => void send()} disabled={!canSend} sx={nbPrimaryBtn}>
          {sending ? 'Gönderiliyor…' : recipient ? `Gönder — ${recipient}` : 'Gönder'}
        </Button>
      </DialogActions>
      <Divider />
    </Dialog>
  );
}
