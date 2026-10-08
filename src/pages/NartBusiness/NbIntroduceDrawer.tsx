import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  InputAdornment,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import {
  nbAdminService,
  NB_INTRODUCTION_STATUS_LABEL,
  type NbIntroDraft,
  type NbIntroduceResult,
  type NbIntroduction,
  type NbMatchAnchorState,
  type NbMatchSuggestion,
} from '../../services/nartbusiness/nbAdminService';
import type { NbMember } from '../../services/nartbusiness/nbTypes';
import { nbWhatsAppLink } from '../../services/nartbusiness/nbPhone';
import { nbErrorMessage } from '../../services/nartbusiness/nbErrorMessage';
import { nb, nbRadius, nbType } from '../../theme/nbBrand';
import {
  INTRO_TEMPLATES,
  activityLabel,
  formatDate,
  matchReason,
  pastByCounterpart,
  scorePct,
  type IntroSide,
} from './nbIntroMatch';

/**
 * Tanıştır yan paneli (v2).
 *
 * <h3>Neden yeniden yazıldı</h3>
 *
 * v1 diyaloğu kör seçim yaptırıyordu: karşı üye yalnız şirket adıyla
 * seçiliyor, öneri yok, seçilen firmanın hiçbir bilgisi görünmüyor, aynı çift
 * tekrar tanıştırılabiliyordu. Bu panel iki soruyu birlikte yanıtlıyor:
 * "bu firmaya kimi tanıştırayım?" (eşleştirme motorunun önerileri, gerekçesiyle)
 * ve "bu iki firma gerçekten uyuyor mu?" (yan yana karşılaştırma + ortak geçmiş).
 *
 * <h3>Kararlar (2026-10-03)</h3>
 *
 * - Daha önce tanıştırılmış çiftler önerilerden DÜŞMEZ, tarih ve sonucuyla
 *   etiketli görünür: sonuçsuz kalmış bir çift yeniden denenebilir.
 * - 60 gün uygulamaya girmemiş üye uyarıyla işaretlenir, engellenmez.
 *
 * Karar mantığı yine admin'de: panel öneriyor ve bilgi veriyor, seçmiyor.
 */

type Candidate = {
  memberId: string;
  companyName: string;
  logoUrl?: string | null;
  sectorCode?: string | null;
  city?: string | null;
  member?: NbMember;
  suggestion?: NbMatchSuggestion;
};

interface Sector {
  code: string;
  nameTr: string;
}

export default function NbIntroduceDrawer({
  open,
  onClose,
  member,
  sectors,
  onDone,
  initialPartner,
}: {
  open: boolean;
  onClose: () => void;
  member: NbMember | null;
  sectors: Sector[];
  onDone: (message: string) => void;
  /** Fırsatlar sekmesinden gelince: önerilen karşı taraf seçili açılır, admin değiştirebilir. */
  initialPartner?: NbMatchSuggestion | null;
}) {
  const sectorName = (code?: string | null) =>
    code ? sectors.find((s) => s.code === code)?.nameTr ?? code : null;
  const sectorsOf = (m?: NbMember | null) => {
    const codes = m?.sectorCodes?.length ? m.sectorCodes : m?.sectorCode ? [m.sectorCode] : [];
    return codes.map((c) => sectorName(c)).filter(Boolean).join(', ') || null;
  };

  // ── Veri ──────────────────────────────────────────────────────────────────
  /** Tanıştırılabilir üyeler (ACTIVE + TRIAL) — öneri satırlarını zenginleştirmek için. */
  const [pool, setPool] = useState<Map<string, NbMember>>(new Map());
  const [suggestions, setSuggestions] = useState<NbMatchSuggestion[]>([]);
  const [anchorState, setAnchorState] = useState<NbMatchAnchorState | null>(null);
  const [aHistory, setAHistory] = useState<NbIntroduction[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Arama (sunucuda; 200 sınırı yok)
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NbMember[] | null>(null);
  const [searching, setSearching] = useState(false);
  const searchSeq = useRef(0);

  // Seçim
  const [target, setTarget] = useState<Candidate | null>(null);
  const [bHistory, setBHistory] = useState<NbIntroduction[] | null>(null);

  // Mesaj — taraflara ayrı metin varsayılan
  const [sameText, setSameText] = useState(false);
  const [shared, setShared] = useState('');
  const [textA, setTextA] = useState('');
  const [textB, setTextB] = useState('');
  const [templateKey, setTemplateKey] = useState<string | null>(null);

  // Gönderim
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<NbIntroduceResult | null>(null);
  const [drafts, setDrafts] = useState<{ a: NbIntroDraft; b: NbIntroDraft } | null>(null);
  const [draftBusy, setDraftBusy] = useState(false);

  const memberId = member?.memberId;

  // Panel açılınca: havuz, öneriler, A'nın geçmişi — paralel.
  useEffect(() => {
    if (!open || !memberId) return;
    setTarget(null);
    setQuery('');
    setResults(null);
    setShared('');
    setTextA('');
    setTextB('');
    setSameText(false);
    setTemplateKey(null);
    setError(null);
    setResult(null);
    setDrafts(null);
    setLoadError(null);
    setLoading(true);
    Promise.allSettled([
      nbAdminService.listMembers({ status: 'ACTIVE', page: 0, size: 200 }),
      nbAdminService.listMembers({ status: 'TRIAL', page: 0, size: 200 }),
      nbAdminService.introductionSuggestions(memberId, 12),
      nbAdminService.listIntroductions({ memberId, page: 0, size: 100 }),
    ]).then(([active, trial, sugg, hist]) => {
      const map = new Map<string, NbMember>();
      for (const r of [active, trial]) {
        if (r.status === 'fulfilled') r.value?.content?.forEach((m) => m.memberId !== memberId && map.set(m.memberId, m));
      }
      setPool(map);
      if (sugg.status === 'fulfilled') {
        setSuggestions(sugg.value.items ?? []);
        setAnchorState(sugg.value.anchorState);
      } else {
        setSuggestions([]);
        setAnchorState(null);
        setLoadError('Öneriler alınamadı; aramayla seçebilirsin.');
      }
      setAHistory(hist.status === 'fulfilled' ? hist.value.items : []);
      if (initialPartner) {
        setTarget({
          memberId: initialPartner.memberId,
          companyName: initialPartner.companyName || initialPartner.displayName || 'Üye',
          logoUrl: initialPartner.logoUrl,
          sectorCode: initialPartner.sectorCode,
          city: initialPartner.city,
          member: map.get(initialPartner.memberId),
          suggestion: initialPartner,
        });
      }
      setLoading(false);
    });
  }, [open, memberId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sunucu araması — 300 ms gecikmeli, ACTIVE + TRIAL.
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      return;
    }
    const seq = ++searchSeq.current;
    setSearching(true);
    const id = setTimeout(async () => {
      try {
        const [a, t] = await Promise.all([
          nbAdminService.listMembers({ status: 'ACTIVE', q, page: 0, size: 25 }),
          nbAdminService.listMembers({ status: 'TRIAL', q, page: 0, size: 25 }),
        ]);
        if (seq !== searchSeq.current) return;
        setResults([...(a?.content ?? []), ...(t?.content ?? [])].filter((m) => m.memberId !== memberId));
      } catch {
        if (seq === searchSeq.current) setResults([]);
      } finally {
        if (seq === searchSeq.current) setSearching(false);
      }
    }, 300);
    return () => clearTimeout(id);
  }, [query, open, memberId]);

  // Hedef seçilince: B'nin tanıştırma geçmişi.
  useEffect(() => {
    if (!target) {
      setBHistory(null);
      return;
    }
    setBHistory(null);
    nbAdminService
      .listIntroductions({ memberId: target.memberId, page: 0, size: 100 })
      .then((r) => setBHistory(r.items))
      .catch(() => setBHistory([]));
    setDrafts(null);
    setResult(null);
  }, [target?.memberId]); // eslint-disable-line react-hooks/exhaustive-deps

  const past = useMemo(() => (memberId ? pastByCounterpart(memberId, aHistory) : new Map<string, NbIntroduction>()), [memberId, aHistory]);

  const toCandidate = (m: NbMember, suggestion?: NbMatchSuggestion): Candidate => ({
    memberId: m.memberId,
    companyName: m.companyName ?? m.displayName ?? m.memberId,
    sectorCode: m.sectorCodes?.[0] ?? m.sectorCode,
    city: m.city,
    member: m,
    suggestion,
    logoUrl: suggestion?.logoUrl,
  });

  const suggestionCandidates: Candidate[] = suggestions.map((s) => {
    const m = pool.get(s.memberId);
    return m
      ? toCandidate(m, s)
      : {
          memberId: s.memberId,
          companyName: s.companyName ?? s.displayName ?? s.memberId,
          logoUrl: s.logoUrl,
          sectorCode: s.sectorCode,
          city: s.city,
          suggestion: s,
        };
  });

  // ── Mesaj ─────────────────────────────────────────────────────────────────
  const sideOf = (m?: NbMember | null, fallbackName?: string): IntroSide => ({
    company: m?.companyName ?? fallbackName ?? 'Üyemiz',
    city: m?.city,
    sector: sectorsOf(m),
    isProfessional: m?.memberType === 'PROFESSIONAL',
    title: m?.personJobTitle,
  });
  const sideA = sideOf(member);
  const sideB = sideOf(target?.member, target?.companyName);

  const applyTemplate = (key: string) => {
    const tpl = INTRO_TEMPLATES.find((t) => t.key === key);
    if (!tpl) return;
    setTemplateKey(key);
    if (sameText) {
      setShared(tpl.build(sideA, sideB));
    } else {
      setTextA(tpl.build(sideA, sideB));
      setTextB(tpl.build(sideB, sideA));
    }
  };

  /** Sunucuya giden metinler: aynı metin modunda yalnız ortak, değilse iki taraf. */
  const payload = () =>
    sameText
      ? { reason: shared.trim() || undefined }
      : { reason: undefined, reasonForA: textA.trim() || undefined, reasonForB: textB.trim() || undefined };
  const messageA = sameText ? shared.trim() : textA.trim();
  const messageB = sameText ? shared.trim() : textB.trim();
  const canSend = !!target && !!messageA && !!messageB && !busy && !result;

  const targetEligible = !!target?.member; // havuzda = ACTIVE veya TRIAL
  const pastPair = target ? past.get(target.memberId) : undefined;

  const send = async () => {
    if (!member || !target) return;
    setBusy(true);
    setError(null);
    try {
      const r = await nbAdminService.createIntroduction({
        memberAId: member.memberId,
        memberBId: target.memberId,
        ...payload(),
      });
      setResult(r);
      setAHistory((h) => [r.introduction, ...h]);
      onDone(`${member.companyName ?? 'Üye'} ↔ ${target.companyName} tanıştırıldı. Takip: Tanıştırmalar.`);
    } catch (e) {
      setError(nbErrorMessage(e, 'Tanıştırma gönderilemedi.'));
    } finally {
      setBusy(false);
    }
  };

  const makeDrafts = async () => {
    if (!member || !target) return;
    setDraftBusy(true);
    setError(null);
    try {
      setDrafts(
        await nbAdminService.introductionDrafts({
          memberAId: member.memberId,
          memberBId: target.memberId,
          ...payload(),
        }),
      );
    } catch (e) {
      setError(nbErrorMessage(e, 'Taslak üretilemedi.'));
    } finally {
      setDraftBusy(false);
    }
  };

  // ── Görünüm ───────────────────────────────────────────────────────────────
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={() => !busy && onClose()}
      PaperProps={{ sx: { width: { xs: '100vw', md: 'min(1180px, 96vw)' }, bgcolor: nb.bg } }}
    >
      {/* Başlık */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={2}
        sx={{ px: 3, py: 2, bgcolor: nb.navy, color: nb.onDark, borderBottom: `1px solid ${nb.onDarkLine}` }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ ...nbType.crumb, color: nb.gold }}>Tanıştır</Typography>
          <Typography sx={{ fontFamily: nbType.serif, fontSize: 26, lineHeight: 1.2 }} noWrap>
            {member?.companyName ?? 'Üye'} için tanışma
          </Typography>
        </Box>
        <IconButton onClick={onClose} disabled={busy} sx={{ color: nb.onDarkMuted }} aria-label="Kapat">
          <CloseIcon />
        </IconButton>
      </Stack>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '400px minmax(0,1fr)' },
          overflow: { xs: 'auto', md: 'hidden' },
        }}
      >
        {/* ── Sol: adaylar ── */}
        <Box sx={{ borderRight: { md: `1px solid ${nb.border}` }, overflow: { md: 'auto' }, p: 2.5 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Şirket, şehir, kişi adı, e-posta…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  {searching ? <CircularProgress size={16} /> : <SearchIcon fontSize="small" />}
                </InputAdornment>
              ),
            }}
            sx={{ bgcolor: nb.surface }}
          />

          {results !== null ? (
            <Section title={`Arama sonuçları · ${results.length}`}>
              {results.length === 0 && !searching && <Empty>Aktif ya da denemedeki üyelerde sonuç yok.</Empty>}
              {results.map((m) => (
                <CandidateRow
                  key={m.memberId}
                  c={toCandidate(m, suggestions.find((s) => s.memberId === m.memberId))}
                  selected={target?.memberId === m.memberId}
                  onSelect={setTarget}
                  past={past.get(m.memberId)}
                  sectorName={sectorName}
                  anchorSector={member?.sectorCodes?.[0] ?? member?.sectorCode}
                />
              ))}
            </Section>
          ) : (
            <Section title="Önerilen firmalar" hint="Eşleştirme motoru · puan 0-100">
              {loading && (
                <Stack alignItems="center" sx={{ py: 4 }}>
                  <CircularProgress size={22} />
                </Stack>
              )}
              {!loading && loadError && <Alert severity="warning">{loadError}</Alert>}
              {!loading && !loadError && anchorState && anchorState !== 'READY' && (
                <Alert severity="info">
                  {anchorState === 'NO_PROFILE'
                    ? 'Bu üyenin dizin profili yok; öneri üretilemiyor. Aramayla seçebilirsin.'
                    : 'Bu üyenin profil vektörü henüz hesaplanmamış; öneri üretilemiyor. NartBusiness › Embedding işleri ekranından eksikleri kuyruğa alabilirsin.'}
                </Alert>
              )}
              {!loading && anchorState === 'READY' && suggestionCandidates.length === 0 && (
                <Empty>Motor uygun aday bulamadı. Aramayla seçebilirsin.</Empty>
              )}
              {suggestionCandidates.map((c) => (
                <CandidateRow
                  key={c.memberId}
                  c={c}
                  selected={target?.memberId === c.memberId}
                  onSelect={setTarget}
                  past={past.get(c.memberId)}
                  sectorName={sectorName}
                  anchorSector={member?.sectorCodes?.[0] ?? member?.sectorCode}
                />
              ))}
            </Section>
          )}
        </Box>

        {/* ── Sağ: seçilen çift ── */}
        <Box sx={{ overflow: { md: 'auto' }, p: { xs: 2.5, md: 3 } }}>
          {!target ? (
            <Stack alignItems="center" justifyContent="center" sx={{ height: '100%', minHeight: 320, textAlign: 'center', color: nb.textMuted }}>
              <Typography sx={{ fontFamily: nbType.serif, fontSize: 24, color: nb.text }}>Bir aday seç</Typography>
              <Typography sx={{ mt: 1, maxWidth: 380, fontSize: 13 }}>
                Soldaki önerilerden ya da aramadan bir firma seç; iki firmayı yan yana görüp mesajı burada hazırlarsın.
              </Typography>
            </Stack>
          ) : (
            <Stack spacing={2.5}>
              {/* Uyarılar */}
              {!targetEligible && (
                <Alert severity="error">
                  Bu firma şu an aktif ya da denemede değil; tanıştırılamaz. Sunucu da reddeder.
                </Alert>
              )}
              {pastPair && (
                <Alert severity="warning">
                  Bu iki firma {formatDate(pastPair.createdAt)} tarihinde tanıştırıldı · Durum:{' '}
                  <b>{NB_INTRODUCTION_STATUS_LABEL[pastPair.status]}</b>
                  {pastPair.adminNote ? ` · Not: ${pastPair.adminNote}` : ''}. Yeniden tanıştırabilirsin.
                </Alert>
              )}

              {/* Karşılaştırma */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                <CompareCard
                  label="Seçili üye"
                  m={member}
                  name={member?.companyName ?? 'Üye'}
                  sectors={sectorsOf(member)}
                  introCount={aHistory.length}
                />
                <CompareCard
                  label="Tanıştırılacak"
                  m={target.member}
                  name={target.companyName}
                  sectors={target.member ? sectorsOf(target.member) : sectorName(target.sectorCode)}
                  introCount={bHistory?.length ?? null}
                  summary={target.suggestion?.summary}
                />
              </Box>

              {target.suggestion && (
                <Box sx={{ p: 2, borderRadius: `${nbRadius.panel}px`, bgcolor: nb.greenTint, border: `1px solid ${nb.border}` }}>
                  <Typography sx={{ ...nbType.label, color: nb.green }}>Neden önerildi</Typography>
                  <Typography sx={{ mt: 0.5, fontSize: 13, color: nb.text }}>
                    {matchReason(target.suggestion, sectorName, member?.sectorCodes?.[0] ?? member?.sectorCode).sentence}
                  </Typography>
                </Box>
              )}

              <Divider />

              {/* Mesaj */}
              <Box>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.25 }}>
                  <Typography sx={{ ...nbType.label, color: nb.textFaint }}>Mesaj</Typography>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Typography sx={{ fontSize: 12, color: nb.textMuted }}>İki tarafa aynı metin</Typography>
                    <Switch size="small" checked={sameText} onChange={(e) => setSameText(e.target.checked)} disabled={busy || !!result} />
                  </Stack>
                </Stack>

                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
                  <Typography sx={{ fontSize: 12, color: nb.textMuted, alignSelf: 'center', mr: 0.5 }}>Şablon:</Typography>
                  {INTRO_TEMPLATES.map((t) => (
                    <Chip
                      key={t.key}
                      label={t.label}
                      size="small"
                      onClick={() => applyTemplate(t.key)}
                      disabled={busy || !!result}
                      variant={templateKey === t.key ? 'filled' : 'outlined'}
                      sx={{ fontSize: 12 }}
                    />
                  ))}
                </Stack>

                {sameText ? (
                  <TextField
                    label="İki tarafın da göreceği metin"
                    value={shared}
                    onChange={(e) => setShared(e.target.value)}
                    disabled={busy || !!result}
                    fullWidth
                    multiline
                    minRows={4}
                    sx={{ bgcolor: nb.surface }}
                  />
                ) : (
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                    <TextField
                      label={`${member?.companyName ?? 'Seçili üye'} görecek`}
                      value={textA}
                      onChange={(e) => setTextA(e.target.value)}
                      disabled={busy || !!result}
                      fullWidth
                      multiline
                      minRows={5}
                      sx={{ bgcolor: nb.surface }}
                    />
                    <TextField
                      label={`${target.companyName} görecek`}
                      value={textB}
                      onChange={(e) => setTextB(e.target.value)}
                      disabled={busy || !!result}
                      fullWidth
                      multiline
                      minRows={5}
                      sx={{ bgcolor: nb.surface }}
                    />
                  </Box>
                )}
              </Box>

              {/* Önizleme: push sabit kalıp; admin metni e-postada gider. */}
              <Box>
                <Typography sx={{ ...nbType.label, color: nb.textFaint, mb: 1 }}>Üyelerin göreceği</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                  <Preview
                    recipient={member}
                    otherName={target.member?.displayName ?? target.companyName}
                    otherCompany={target.companyName}
                    message={messageA}
                  />
                  <Preview
                    recipient={target.member}
                    otherName={member?.displayName ?? member?.companyName ?? 'Üyemiz'}
                    otherCompany={member?.companyName}
                    message={messageB}
                  />
                </Box>
              </Box>

              {error && <Alert severity="error">{error}</Alert>}

              {result && (
                <Alert severity="success">
                  <b>Tanıştırma kaydedildi.</b>
                  <DeliveryLine name={member?.companyName ?? 'Seçili üye'} d={result.deliveryA} />
                  <DeliveryLine name={target.companyName} d={result.deliveryB} />
                </Alert>
              )}

              {/* WhatsApp taslağı */}
              {drafts && (
                <Stack spacing={1.25}>
                  {[drafts.a, drafts.b].map((d) => {
                    const wa = nbWhatsAppLink(d.phone, d.draft);
                    return (
                      <Box key={d.memberId} sx={{ bgcolor: nb.surface, border: `1px solid ${nb.border}`, borderRadius: `${nbRadius.panel}px`, p: 1.5 }}>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.75 }}>
                          <Typography sx={{ fontSize: 12.5, fontWeight: 600, flex: 1 }} noWrap>
                            {d.memberName ?? 'Üye'}
                          </Typography>
                          <Button size="small" onClick={() => void navigator.clipboard?.writeText(d.draft)} sx={{ textTransform: 'none', fontSize: 12 }}>
                            Kopyala
                          </Button>
                          {wa ? (
                            <Button size="small" component="a" href={wa} target="_blank" rel="noreferrer" sx={{ textTransform: 'none', fontSize: 12 }}>
                              WhatsApp'ta aç
                            </Button>
                          ) : (
                            <Typography sx={{ fontSize: 11, color: nb.amber }}>Numarası kayıtlı değil</Typography>
                          )}
                        </Stack>
                        <Typography sx={{ fontSize: 11.5, whiteSpace: 'pre-wrap' }}>{d.draft}</Typography>
                      </Box>
                    );
                  })}
                </Stack>
              )}

              {/* Eylemler */}
              <Stack direction="row" spacing={1.25} alignItems="center" sx={{ pt: 0.5 }}>
                <Button
                  variant="contained"
                  disabled={!canSend || !targetEligible}
                  onClick={send}
                  sx={{ textTransform: 'none', bgcolor: nb.navy, '&:hover': { bgcolor: nb.navySoft } }}
                >
                  {busy ? 'Gönderiliyor…' : result ? 'Gönderildi' : 'Tanıştır ve bildir'}
                </Button>
                <Button
                  variant="outlined"
                  disabled={!target || draftBusy || busy || !messageA || !messageB}
                  onClick={makeDrafts}
                  sx={{ textTransform: 'none' }}
                >
                  {draftBusy ? 'Hazırlanıyor…' : 'WhatsApp taslağı'}
                </Button>
                <Typography sx={{ fontSize: 11.5, color: nb.textMuted }}>
                  {!messageA || !messageB
                    ? 'İki tarafın da göreceği bir metin gerekli.'
                    : 'Bildirim + e-posta iki tarafa gider; taslak kayıt açmaz.'}
                </Typography>
              </Stack>
            </Stack>
          )}
        </Box>
      </Box>
    </Drawer>
  );
}

// ── Alt bileşenler ──────────────────────────────────────────────────────────

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mt: 2.5 }}>
      <Stack direction="row" alignItems="baseline" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography sx={{ ...nbType.label, color: nb.textFaint }}>{title}</Typography>
        {hint && <Typography sx={{ fontSize: 10.5, color: nb.textFaint, fontFamily: nbType.mono }}>{hint}</Typography>}
      </Stack>
      <Stack spacing={1}>{children}</Stack>
    </Box>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <Typography sx={{ fontSize: 12.5, color: nb.textMuted, py: 2 }}>{children}</Typography>;
}

function Initial({ name, logoUrl }: { name: string; logoUrl?: string | null }) {
  const [failed, setFailed] = useState(false);
  return (
    <Box
      sx={{
        width: 36,
        height: 36,
        flexShrink: 0,
        borderRadius: `${nbRadius.control}px`,
        border: `1px solid ${nb.border}`,
        bgcolor: nb.inputBg,
        display: 'grid',
        placeItems: 'center',
        overflow: 'hidden',
        fontWeight: 600,
        color: nb.text,
        fontSize: 14,
      }}
    >
      {logoUrl && !failed ? (
        <img src={logoUrl} alt="" onError={() => setFailed(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        name.charAt(0).toLocaleUpperCase('tr')
      )}
    </Box>
  );
}

function CandidateRow({
  c,
  selected,
  onSelect,
  past,
  sectorName,
  anchorSector,
}: {
  c: Candidate;
  selected: boolean;
  onSelect: (c: Candidate) => void;
  past?: NbIntroduction;
  sectorName: (code?: string | null) => string | null;
  anchorSector?: string | null;
}) {
  const act = activityLabel(c.member);
  const eligible = !!c.member;
  const reason = c.suggestion ? matchReason(c.suggestion, sectorName, anchorSector) : null;
  const pct = scorePct(c.suggestion?.score);
  const sub = [sectorName(c.sectorCode), c.city].filter(Boolean).join(' · ');

  return (
    <Box
      component="button"
      type="button"
      onClick={() => onSelect(c)}
      sx={{
        textAlign: 'left',
        width: '100%',
        p: 1.5,
        borderRadius: `${nbRadius.panel}px`,
        border: `1px solid ${selected ? nb.navy : nb.border}`,
        bgcolor: selected ? nb.surface : eligible ? nb.surface : nb.inputBg,
        boxShadow: selected ? `inset 3px 0 0 ${nb.gold}` : 'none',
        cursor: 'pointer',
        opacity: eligible ? 1 : 0.6,
        font: 'inherit',
        color: 'inherit',
        transition: 'border-color .2s',
        '&:hover': { borderColor: nb.navySoft },
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="flex-start">
        <Initial name={c.companyName} logoUrl={c.logoUrl} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="baseline" spacing={1}>
            <Typography sx={{ fontSize: 13.5, fontWeight: 600, flex: 1, minWidth: 0 }} noWrap>
              {c.companyName}
            </Typography>
            {pct !== null && (
              <Tooltip title="Eşleştirme puanı (0-100): profil benzerliği, tedarik zinciri, şehir ve doğrulama">
                <Typography sx={{ fontFamily: nbType.mono, fontSize: 12, color: nb.green }}>{pct}</Typography>
              </Tooltip>
            )}
          </Stack>
          {sub && <Typography sx={{ fontSize: 12, color: nb.textMuted }} noWrap>{sub}</Typography>}
          {reason && <Typography sx={{ mt: 0.5, fontSize: 12, color: nb.text }}>{reason.sentence}</Typography>}
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.75 }}>
            {reason?.tags.map((t) => (
              <Tag key={t}>{t}</Tag>
            ))}
            {past && (
              <Tag tone="amber">
                Tanıştırıldı · {formatDate(past.createdAt)} · {NB_INTRODUCTION_STATUS_LABEL[past.status]}
              </Tag>
            )}
            {act?.inactive && <Tag tone="amber">{act.text}</Tag>}
            {!eligible && <Tag tone="red">Aktif/deneme değil</Tag>}
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}

function Tag({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'amber' | 'red' }) {
  const colors = {
    neutral: { bg: nb.inputBg, fg: nb.textMuted },
    amber: { bg: nb.amberTint, fg: nb.amber },
    red: { bg: nb.redTint, fg: nb.red },
  }[tone];
  return (
    <Box component="span" sx={{ fontSize: 11, px: 0.9, py: 0.25, borderRadius: `${nbRadius.badge}px`, bgcolor: colors.bg, color: colors.fg }}>
      {children}
    </Box>
  );
}

function CompareCard({
  label,
  m,
  name,
  sectors,
  introCount,
  summary,
}: {
  label: string;
  m?: NbMember | null;
  name: string;
  sectors?: string | null;
  introCount: number | null;
  summary?: string | null;
}) {
  const act = activityLabel(m);
  const rows: [string, React.ReactNode][] = [
    ['Sektör', sectors || '—'],
    ['Konum', [m?.district, m?.city].filter(Boolean).join(', ') || '—'],
    ['Tip', m?.memberType === 'PROFESSIONAL' ? `Profesyonel${m?.personJobTitle ? ` · ${m.personJobTitle}` : ''}` : 'İşletme'],
    ['Durum', m ? (m.status === 'TRIAL' ? 'Deneme' : m.status === 'ACTIVE' ? 'Aktif' : m.status) : '—'],
    ['Son aktiflik', act ? <span style={{ color: act.inactive ? nb.amber : undefined }}>{act.text}</span> : '—'],
    ['Telefon', m?.phoneNumber ? (m.whatsappEnabled ? 'Kayıtlı · WhatsApp' : 'Kayıtlı') : 'Yok'],
    ['Tanıştırmaları', introCount === null ? '…' : introCount === 0 ? 'İlk kez' : `${introCount} kez`],
  ];
  const about = m?.expertise || m?.businessDescription || summary;
  return (
    <Box sx={{ p: 2, borderRadius: `${nbRadius.card}px`, bgcolor: nb.surface, border: `1px solid ${nb.border}` }}>
      <Typography sx={{ ...nbType.label, color: nb.textFaint }}>{label}</Typography>
      <Typography sx={{ mt: 0.5, fontSize: 16, fontWeight: 600 }} noWrap>
        {name}
      </Typography>
      {about && (
        <Typography sx={{ mt: 0.75, fontSize: 12, color: nb.textMuted, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {about}
        </Typography>
      )}
      <Box component="dl" sx={{ m: 0, mt: 1.25, display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 1.5, rowGap: 0.5 }}>
        {rows.map(([k, v]) => (
          <Box key={k} sx={{ display: 'contents' }}>
            <Typography component="dt" sx={{ fontSize: 11.5, color: nb.textFaint }}>{k}</Typography>
            <Typography component="dd" sx={{ m: 0, fontSize: 12, color: nb.text }}>{v}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

/**
 * Üyenin göreceği: bildirim sunucuda sabit bir kalıp (admin metni girmiyor),
 * admin metni e-postada gidiyor. Önizleme ikisini ayırıyor ki admin
 * metninin bildirimde görüneceğini sanmasın.
 */
function Preview({
  recipient,
  otherName,
  otherCompany,
  message,
}: {
  recipient?: NbMember | null;
  otherName: string;
  otherCompany?: string | null;
  message: string;
}) {
  const firstName = recipient?.displayName?.split(' ')[0];
  return (
    <Box sx={{ p: 1.75, borderRadius: `${nbRadius.panel}px`, bgcolor: nb.surface, border: `1px solid ${nb.border}` }}>
      <Typography sx={{ fontSize: 12, fontWeight: 600 }} noWrap>
        {recipient?.companyName ?? 'Alıcı'}
      </Typography>
      <Box sx={{ mt: 1, p: 1.25, borderRadius: `${nbRadius.control}px`, bgcolor: nb.inputBg }}>
        <Typography sx={{ fontSize: 10, color: nb.textFaint, fontFamily: nbType.mono }}>BİLDİRİM</Typography>
        <Typography sx={{ fontSize: 12, fontWeight: 600 }}>Yeni iş bağlantısı: {otherName}</Typography>
        <Typography sx={{ fontSize: 11.5, color: nb.textMuted }}>
          {otherCompany ? `${otherCompany} ile ortak ` : 'Ortak '}bir iş birliği fırsatınız olabilir. Tanışmak ve detayı görmek için dokunun.
        </Typography>
      </Box>
      <Box sx={{ mt: 1, p: 1.25, borderRadius: `${nbRadius.control}px`, border: `1px dashed ${nb.inputBorder}` }}>
        <Typography sx={{ fontSize: 10, color: nb.textFaint, fontFamily: nbType.mono }}>E-POSTA</Typography>
        <Typography sx={{ fontSize: 11.5 }}>Sayın {firstName ?? 'Üyemiz'},</Typography>
        <Typography sx={{ fontSize: 11.5, color: message ? nb.text : nb.textFaint, whiteSpace: 'pre-wrap', mt: 0.5 }}>
          {message || 'Metin henüz yazılmadı.'}
        </Typography>
      </Box>
    </Box>
  );
}

function DeliveryLine({ name, d }: { name: string; d: { push: boolean; email: boolean } }) {
  return (
    <Typography sx={{ fontSize: 12.5, mt: 0.5 }}>
      {name}: bildirim {d.push ? 'iletildi' : 'iletilemedi'} · e-posta{' '}
      {d.email ? 'gitti' : 'gitmedi (adres yok ya da gönderim hatası)'}
    </Typography>
  );
}

