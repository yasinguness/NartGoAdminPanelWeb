import { ReactNode, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { tr } from 'date-fns/locale';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import HowToRegOutlinedIcon from '@mui/icons-material/HowToRegOutlined';
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined';
import CloseIcon from '@mui/icons-material/Close';
import {
  RaffleCampaign,
  RaffleEntryMode,
  RafflePopupFrequency,
  RaffleStatus,
  raffleAdminService,
} from '../../services/raffle/raffleAdminService';
import {
  FormErrors,
  FormState,
  FREQ_LABEL,
  campaignToForm,
  durationText,
  emptyForm,
  formToRequest,
  hasErrors,
  newPrize,
  validateForm,
} from './raffleForm';
import RaffleImageField from './RaffleImageField';

const DAY = 24 * 60 * 60 * 1000;

/** Bölüm başlığı: başlık + tek satır açıklama. */
function Section({ title, hint, children, id }: { title: string; hint?: string; children: ReactNode; id?: string }) {
  return (
    <Box component="section" id={id} sx={{ scrollMarginTop: 16 }}>
      <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
      {hint && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>{hint}</Typography>}
      <Stack spacing={2} sx={{ mt: 2 }}>{children}</Stack>
    </Box>
  );
}

function ModeCard({
  selected, disabled, icon, title, text, onClick,
}: { selected: boolean; disabled: boolean; icon: ReactNode; title: string; text: string; onClick: () => void }) {
  return (
    <Box
      role="radio"
      aria-checked={selected}
      tabIndex={disabled ? -1 : 0}
      onClick={() => !disabled && onClick()}
      onKeyDown={(e) => { if (!disabled && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onClick(); } }}
      sx={{
        flex: 1,
        p: 2,
        borderRadius: 2,
        border: 2,
        borderColor: selected ? 'primary.main' : 'divider',
        bgcolor: selected ? 'action.selected' : 'background.paper',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled && !selected ? 0.5 : 1,
        transition: 'border-color .15s',
        '&:focus-visible': { outline: 2, outlineColor: 'primary.main', outlineOffset: 2 },
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        {icon}
        <Typography fontWeight={700}>{title}</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>{text}</Typography>
    </Box>
  );
}

export default function RaffleCampaignForm({
  open,
  editing,
  onClose,
  onSaved,
}: {
  open: boolean;
  editing: RaffleCampaign | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(editing ? campaignToForm(editing) : emptyForm());
    setSubmitted(false);
    setServerError(null);
  }, [open, editing]);

  const errors: FormErrors = useMemo(() => (submitted ? validateForm(form) : {}), [form, submitted]);
  const join = form.entryMode === 'JOIN';
  const prizesLocked = !!editing?.winnersDrawn;
  const modeLocked = !!editing && (editing.winnersDrawn || (editing.eligibleCount ?? 0) > 0);
  const duration = durationText(form.startsAt, form.endsAt);
  const winnerTotal = form.prizes.filter((p) => p.title.trim()).reduce((n, p) => n + Math.max(1, Number(p.quantity) || 1), 0);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));
  const setPrize = (key: string, patch: Partial<FormState['prizes'][number]>) =>
    setForm((prev) => ({ ...prev, prizes: prev.prizes.map((p) => (p.key === key ? { ...p, ...patch } : p)) }));
  const movePrize = (index: number, dir: -1 | 1) =>
    setForm((prev) => {
      const next = [...prev.prizes];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...prev, prizes: next };
    });

  /** Süre kısayolu: başlangıç yoksa şimdi başlar. */
  const setLength = (days: number) => {
    const start = form.startsAt && !Number.isNaN(form.startsAt.getTime()) ? form.startsAt : new Date();
    setForm((prev) => ({ ...prev, startsAt: start, endsAt: new Date(start.getTime() + days * DAY) }));
  };

  const save = async () => {
    setSubmitted(true);
    setServerError(null);
    const found = validateForm(form);
    if (hasErrors(found)) {
      // İlk hatalı alana kaydır; kullanıcı neyin eksik olduğunu orada görür.
      const order = ['name', 'startsAt', 'endsAt', 'prize', 'xpPerEntry', 'prizes'] as const;
      const first = order.find((k) => found[k]) ?? (found.prizeRows ? 'prizes' : undefined);
      if (first) document.getElementById(`raffle-${first}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setSaving(true);
    try {
      const body = formToRequest(form, prizesLocked);
      if (editing) {
        await raffleAdminService.update(editing.id, body);
        onSaved('Çekiliş güncellendi');
      } else {
        await raffleAdminService.create(body);
        onSaved(form.status === 'ACTIVE' ? 'Çekiliş oluşturuldu ve yayında' : 'Çekiliş taslak olarak kaydedildi');
      }
    } catch (e: any) {
      setServerError(e?.response?.data?.message || 'Kaydedilemedi. Bağlantını kontrol edip tekrar dene.');
    } finally {
      setSaving(false);
    }
  };

  const statusOptions: { value: RaffleStatus; label: string }[] = [
    { value: 'DRAFT', label: 'Taslak' },
    { value: 'ACTIVE', label: 'Yayında' },
    ...(editing ? [{ value: 'ENDED' as RaffleStatus, label: 'Bitti' }, { value: 'CANCELLED' as RaffleStatus, label: 'İptal' }] : []),
  ];
  const statusHint: Record<RaffleStatus, string> = {
    DRAFT: 'Uygulamada görünmez. Hazır olunca "Yayında" yap.',
    ACTIVE: 'Başlangıç ile bitiş arasında uygulamada görünür.',
    ENDED: 'Katılım kapalı. Kura çekilince kendiliğinden bu duruma geçer.',
    CANCELLED: 'Uygulamada görünmez, kura çekilemez.',
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle sx={{ pr: 6 }}>
        {editing ? 'Çekilişi düzenle' : 'Yeni çekiliş'}
        <IconButton aria-label="Kapat" onClick={onClose} disabled={saving} sx={{ position: 'absolute', right: 12, top: 12 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
          <Stack spacing={4} divider={<Divider flexItem />}>
            {serverError && <Alert severity="error" onClose={() => setServerError(null)}>{serverError}</Alert>}

            {/* ── Çekiliş ── */}
            <Section title="Çekiliş" hint="Ad uygulamada çekiliş sayfasının başlığı olur.">
              <TextField id="raffle-name" label="Çekiliş adı" required fullWidth value={form.name} autoFocus={!editing}
                placeholder="örn. Bahar çekilişi"
                error={!!errors.name} helperText={errors.name}
                onChange={(e) => set('name', e.target.value)} />
              <Box>
                <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>Katılım nasıl olacak?</Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} role="radiogroup">
                  <ModeCard
                    selected={join} disabled={modeLocked}
                    icon={<HowToRegOutlinedIcon color={join ? 'primary' : 'action'} />}
                    title="Çekilişe katıl"
                    text={'Kullanıcı uygulamada "Çekilişe katıl"a basar; herkes bir kez katılır. Hediyeleri sen belirlersin.'}
                    onClick={() => set('entryMode', 'JOIN' as RaffleEntryMode)}
                  />
                  <ModeCard
                    selected={!join} disabled={modeLocked}
                    icon={<BoltOutlinedIcon color={!join ? 'primary' : 'action'} />}
                    title="XP ile hak"
                    text="Kullanıcı ayrıca katılmaz; çekiliş süresinde kazandığı XP kadar hakkı olur."
                    onClick={() => set('entryMode', 'XP' as RaffleEntryMode)}
                  />
                </Stack>
                {modeLocked && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Katılım başladığı için tür değiştirilemez.
                  </Typography>
                )}
              </Box>
              <TextField label="Kısa açıklama" fullWidth multiline minRows={2} value={form.description}
                placeholder="örn. Topluluğumuzun 5. yılına özel üç hediye"
                helperText="İsteğe bağlı. Çekiliş sayfasında adın altında görünür."
                onChange={(e) => set('description', e.target.value)} />
            </Section>

            {/* ── Tarih ── */}
            <Section title="Tarih" hint="Katılım bu aralıkta açık. Bitişten sonra kurayı çekebilirsin.">
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Box id="raffle-startsAt" sx={{ flex: 1 }}>
                  <DateTimePicker label="Başlangıç *" value={form.startsAt} ampm={false}
                    onChange={(d) => set('startsAt', d)}
                    slotProps={{ textField: { fullWidth: true, error: !!errors.startsAt, helperText: errors.startsAt } }} />
                </Box>
                <Box id="raffle-endsAt" sx={{ flex: 1 }}>
                  <DateTimePicker label="Bitiş *" value={form.endsAt} ampm={false}
                    minDateTime={form.startsAt ?? undefined}
                    onChange={(d) => set('endsAt', d)}
                    slotProps={{ textField: { fullWidth: true, error: !!errors.endsAt, helperText: errors.endsAt } }} />
                </Box>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography variant="body2" color="text.secondary">Hızlı seç:</Typography>
                <Chip label="Şimdi başlasın" size="small" variant="outlined"
                  onClick={() => set('startsAt', new Date())} />
                {[
                  ['1 hafta', 7],
                  ['2 hafta', 14],
                  ['1 ay', 30],
                ].map(([label, days]) => (
                  <Chip key={label} label={label as string} size="small" variant="outlined"
                    onClick={() => setLength(days as number)} />
                ))}
                {duration && (
                  <Typography variant="body2" sx={{ ml: { sm: 'auto' } }}>
                    Süre: <strong>{duration}</strong>
                  </Typography>
                )}
              </Stack>
            </Section>

            {/* ── Hediyeler / Ödül ── */}
            {join ? (
              <Section title="Hediyeler"
                hint="Kura bu sırayla çekilir; her hediyeye adedi kadar kazanan. Bir kişi iki hediye kazanamaz.">
                {prizesLocked && <Alert severity="warning">Kura çekildi; hediyeler artık değiştirilemez.</Alert>}
                <Stack id="raffle-prizes" spacing={1.5}>
                  {form.prizes.map((p, i) => {
                    const rowError = errors.prizeRows?.[p.key];
                    return (
                      <Stack key={p.key} direction="row" spacing={1.5} alignItems="flex-start">
                        <RaffleImageField compact label="Hediye görseli" value={p.imageUrl ?? ''} pathPrefix="raffles/prizes"
                          disabled={prizesLocked} onChange={(url) => setPrize(p.key, { imageUrl: url })} />
                        <TextField label={`${i + 1}. hediye`} size="small" sx={{ flex: 1 }} value={p.title}
                          placeholder="örn. Kafkas kilimi" disabled={prizesLocked}
                          error={!!rowError || (!!errors.prizes && i === 0)}
                          helperText={rowError ?? (i === 0 ? errors.prizes : undefined)}
                          onChange={(e) => setPrize(p.key, { title: e.target.value })} />
                        <TextField label="Adet" type="number" size="small" sx={{ width: 88 }} value={p.quantity}
                          disabled={prizesLocked} inputProps={{ min: 1, max: 1000 }}
                          onChange={(e) => setPrize(p.key, { quantity: Math.max(1, Number(e.target.value) || 1) })} />
                        <Stack direction="row" sx={{ pt: 0.5 }}>
                          <Tooltip title="Yukarı">
                            <span>
                              <IconButton size="small" disabled={i === 0 || prizesLocked} onClick={() => movePrize(i, -1)}>
                                <ArrowUpwardIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Aşağı">
                            <span>
                              <IconButton size="small" disabled={i === form.prizes.length - 1 || prizesLocked}
                                onClick={() => movePrize(i, 1)}>
                                <ArrowDownwardIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Sil">
                            <span>
                              <IconButton size="small" disabled={form.prizes.length === 1 || prizesLocked}
                                onClick={() => set('prizes', form.prizes.filter((x) => x.key !== p.key))}>
                                <DeleteOutlineIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Stack>
                      </Stack>
                    );
                  })}
                </Stack>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Button size="small" startIcon={<AddIcon />} disabled={prizesLocked}
                    onClick={() => set('prizes', [...form.prizes, newPrize()])}>
                    Hediye ekle
                  </Button>
                  {winnerTotal > 0 && (
                    <Typography variant="body2" color="text.secondary">
                      Toplam <strong>{winnerTotal}</strong> kazanan
                    </Typography>
                  )}
                </Stack>
              </Section>
            ) : (
              <Section title="Ödül ve hak" hint="Hak = çekiliş süresinde kazanılan XP ÷ hak başına XP.">
                <TextField id="raffle-prize" label="Ödül" required fullWidth value={form.prize} placeholder="örn. Akordeon"
                  error={!!errors.prize} helperText={errors.prize}
                  onChange={(e) => set('prize', e.target.value)} />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField id="raffle-xpPerEntry" label="Hak başına XP" type="number" fullWidth value={form.xpPerEntry}
                    error={!!errors.xpPerEntry} helperText={errors.xpPerEntry ?? 'örn. 50 XP = 1 hak'}
                    InputProps={{ endAdornment: <InputAdornment position="end">XP</InputAdornment> }}
                    onChange={(e) => set('xpPerEntry', Number(e.target.value))} />
                  <TextField label="Kişi başı en fazla hak" type="number" fullWidth value={form.maxEntriesPerUser}
                    helperText="Boş bırakırsan sınır yok."
                    onChange={(e) => set('maxEntriesPerUser', e.target.value)} />
                </Stack>
              </Section>
            )}

            {/* ── Çekiliş sayfası (JOIN) ── */}
            {join && (
              <Section title="Çekiliş sayfası" hint="Kullanıcının uygulamada gördüğü sayfa ve story görseli.">
                <RaffleImageField label="Kapak görseli" value={form.coverImageUrl} pathPrefix="raffles/covers"
                  helperText="Yatay görsel önerilir. Story'de de bu kullanılır."
                  onChange={(url) => set('coverImageUrl', url)} />
                <TextField label="Katılım koşulları" fullWidth multiline minRows={4} value={form.rules}
                  placeholder={'örn.\n• 18 yaşından büyük NartGo üyeleri katılabilir.\n• Kazananlarla uygulama içinden iletişime geçilir.'}
                  helperText="İsteğe bağlı. Çekiliş sayfasının altında görünür."
                  onChange={(e) => set('rules', e.target.value)} />
              </Section>
            )}

            {/* ── Açılış penceresi ── */}
            <Section title="Açılış penceresi" hint="Uygulama açılınca çekilişi tanıtan pencere.">
              <Stack direction="row" alignItems="center" justifyContent="space-between"
                sx={{ p: 1.5, borderRadius: 2, border: 1, borderColor: 'divider' }}>
                <Box>
                  <Typography fontWeight={600}>{form.popupEnabled ? 'Pencere gösterilecek' : 'Pencere gösterilmeyecek'}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {join ? 'Düğmesi çekiliş sayfasını açar. Katılmış kullanıcıya tekrar gösterilmez.' : 'Çekiliş süresince gösterilir.'}
                  </Typography>
                </Box>
                <Switch checked={form.popupEnabled} onChange={(e) => set('popupEnabled', e.target.checked)}
                  inputProps={{ 'aria-label': 'Açılış penceresi' }} />
              </Stack>
              <Collapse in={form.popupEnabled} unmountOnExit>
                <Stack spacing={2}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField label="Başlık" fullWidth value={form.popupTitle}
                      placeholder={form.name || 'Çekiliş adı'} helperText="Boş bırakırsan çekiliş adı kullanılır."
                      onChange={(e) => set('popupTitle', e.target.value)} />
                    <TextField label="Düğme yazısı" fullWidth value={form.popupCtaText}
                      placeholder={join ? 'Çekilişe katıl' : 'Hakkını artır'}
                      helperText={join ? 'Boş bırakırsan "Çekilişe katıl".' : undefined}
                      onChange={(e) => set('popupCtaText', e.target.value)} />
                  </Stack>
                  <TextField label="Metin" fullWidth multiline minRows={2} value={form.popupBody}
                    placeholder="örn. Üç hediye seni bekliyor. Katılmak bir dokunuş."
                    onChange={(e) => set('popupBody', e.target.value)} />
                  <RaffleImageField label="Pencere görseli" value={form.popupImageUrl} pathPrefix="raffles/popups"
                    helperText={join ? 'Boş bırakırsan kapak görseli kullanılır.' : undefined}
                    onChange={(url) => set('popupImageUrl', url)} />
                  <TextField label="Ne sıklıkla?" select sx={{ maxWidth: 260 }} value={form.popupFrequency}
                    onChange={(e) => set('popupFrequency', e.target.value as RafflePopupFrequency)}>
                    {(Object.keys(FREQ_LABEL) as RafflePopupFrequency[]).map((f) => (
                      <MenuItem key={f} value={f}>{FREQ_LABEL[f]}</MenuItem>
                    ))}
                  </TextField>
                </Stack>
              </Collapse>
            </Section>
          </Stack>
        </LocalizationProvider>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 2, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
          <ToggleButtonGroup size="small" exclusive value={form.status}
            onChange={(_, v) => v && set('status', v as RaffleStatus)} aria-label="Yayın durumu">
            {statusOptions.map((o) => (
              <ToggleButton key={o.value} value={o.value} sx={{ px: 1.5 }}>{o.label}</ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 260 }}>
            {statusHint[form.status]}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button onClick={onClose} disabled={saving}>Vazgeç</Button>
          <Button variant="contained" onClick={save} disabled={saving}>
            {saving ? 'Kaydediliyor…' : editing ? 'Kaydet' : form.status === 'ACTIVE' ? 'Oluştur ve yayınla' : 'Taslak olarak kaydet'}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
