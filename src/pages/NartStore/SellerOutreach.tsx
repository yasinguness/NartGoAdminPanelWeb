import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton,
  InputAdornment, MenuItem, Paper, Radio, RadioGroup, Stack, Switch, Tab, Table, TableBody, TableCell, TableHead, TablePagination,
  TableRow, Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AddIcon from '@mui/icons-material/Add';
import EditNoteIcon from '@mui/icons-material/EditNote';
import StorefrontIcon from '@mui/icons-material/Storefront';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import * as XLSX from 'xlsx';
import { useSnackbar } from 'notistack';
import { businessService } from '../../services/business/businessService';
import type { BusinessDto } from '../../types/businesses/businessModel';
import { errorText } from '../../services/nartstore/storeActivityService';
import {
  SOURCE_LABEL, STATUS_META, formatPhone, renderTemplate, sellerOutreachService, whatsappLink,
  type OutreachContact, type OutreachImportResult, type OutreachImportRow, type OutreachSource, type OutreachStatus,
  type OutreachSummary, type OutreachTemplates,
} from '../../services/nartstore/sellerOutreachService';

/**
 * NartStore › Satıcı Daveti. Kafnet rehberindeki firmalara ve NartGo'daki işletmelere WhatsApp'tan
 * NartStore daveti. Mesaj otomatik gitmez: "WhatsApp'ta aç" hazır metinle sohbeti açar, gönder tuşuna
 * siz basarsınız. Toplu otomatik gönderim WhatsApp kurallarına aykırı ve numarayı kapattırır; resmi
 * WhatsApp Business API ise yalnız onay vermiş kişilere şablon mesaj atabiliyor.
 */

/** WhatsApp kısa sürede çok sayıda yeni kişiye yazan hesabı kısıtlayabiliyor. */
const DAILY_SOFT_LIMIT = 40;

const TABS: { key: string; label: string }[] = [
  { key: 'TODO', label: 'Yazılacaklar' },
  { key: 'SENT', label: 'Mesaj Gönderildi' },
  { key: 'REPLIED', label: 'Yanıt Verdi' },
  { key: 'INTERESTED', label: 'İlgileniyor' },
  { key: 'SELLER', label: 'Mağaza Açtı' },
  { key: 'DECLINED', label: 'İlgilenmiyor' },
  { key: 'OPTED_OUT', label: 'Bir Daha Yazma' },
  { key: 'INVALID', label: 'Numara Geçersiz' },
  { key: 'ALL', label: 'Tümü' },
];

const fmtTime = (iso: string) => new Date(iso).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function SellerOutreach() {
  const { enqueueSnackbar } = useSnackbar();
  const [tab, setTab] = useState('TODO');
  const [source, setSource] = useState('ALL');
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [whatsappOnly, setWhatsappOnly] = useState(true);
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<OutreachContact[] | null>(null);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<OutreachSummary | null>(null);
  const [error, setError] = useState('');
  const [templates, setTemplates] = useState<OutreachTemplates | null>(null);
  const [dialog, setDialog] = useState<'templates' | 'nartgo' | 'manual' | null>(null);
  const [noteFor, setNoteFor] = useState<OutreachContact | null>(null);
  const [importResult, setImportResult] = useState<{ label: string; result: OutreachImportResult } | null>(null);
  const [busyImport, setBusyImport] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const notifyError = useCallback((e: unknown) => enqueueSnackbar(errorText(e), { variant: 'error' }), [enqueueSnackbar]);

  const load = useCallback(async () => {
    try {
      const data = await sellerOutreachService.list({ status: tab, source, q: query || undefined, whatsappOnly, page: page + 1 });
      setItems(data.items);
      setTotal(data.total);
      setSummary(data.summary);
      setError('');
    } catch (e) {
      setError(errorText(e));
      setItems((prev) => prev ?? []);
    }
  }, [tab, source, query, whatsappOnly, page]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { sellerOutreachService.templates().then(setTemplates).catch(() => undefined); }, []);
  useEffect(() => {
    const t = setTimeout(() => { setQuery(q.trim()); setPage(0); }, 350);
    return () => clearTimeout(t);
  }, [q]);

  const replaceItem = (c: OutreachContact) => setItems((prev) => (prev ? prev.map((x) => (x.id === c.id ? c : x)) : prev));

  // ── WhatsApp ────────────────────────────────────────────
  const openWhatsApp = async (c: OutreachContact) => {
    if (!templates) return;
    if (c.doNotWrite) {
      const why = STATUS_META[c.status].label;
      if (!window.confirm(`Bu kayıt "${why}" durumunda. Yine de yazmak istiyor musunuz?`)) return;
    }
    if (c.sentCount > 0 && c.status !== 'NEW' && !c.doNotWrite) {
      if (!window.confirm(`${c.name} kaydına daha önce ${c.sentCount} kez yazıldı (son: ${c.lastSentAt ? fmtTime(c.lastSentAt) : '-'}). Yeniden açılsın mı?`)) return;
    }
    const text = renderTemplate(templates[c.source], c);
    // Açılır pencere engellenmesin diye sekme tıklamada hemen açılır, kayıt ardından düşülür.
    window.open(whatsappLink(c.phone, text), '_blank', 'noopener');
    try {
      replaceItem(await sellerOutreachService.markSent(c.id, c.status === 'OPTED_OUT'));
      setSummary((s) => (s ? { ...s, sentToday: s.sentToday + 1 } : s));
    } catch (e) {
      notifyError(e);
    }
  };

  const setStatus = async (c: OutreachContact, status: OutreachStatus) => {
    try {
      replaceItem(await sellerOutreachService.update(c.id, { status }));
    } catch (e) {
      notifyError(e);
    }
  };

  const remove = async (c: OutreachContact) => {
    if (!window.confirm(`${c.name} listeden silinsin mi? (Bir daha yazılmaması isteniyorsa silmek yerine "Bir Daha Yazma" seçin; silinen kayıt yeniden içe aktarılabilir.)`)) return;
    try {
      await sellerOutreachService.remove(c.id);
      void load();
    } catch (e) {
      notifyError(e);
    }
  };

  // ── İçe aktarma ─────────────────────────────────────────
  const runImport = async (label: string, src: OutreachSource, rows: OutreachImportRow[]) => {
    if (!rows.length) {
      enqueueSnackbar('Aktarılacak satır bulunamadı.', { variant: 'warning' });
      return;
    }
    setBusyImport(true);
    const sum: OutreachImportResult = { created: 0, merged: 0, alreadySeller: 0, skippedNoPhone: 0, landlineOnly: 0, skipped: [] };
    try {
      for (let i = 0; i < rows.length; i += 400) {
        const r = await sellerOutreachService.import(src, rows.slice(i, i + 400));
        sum.created += r.created;
        sum.merged += r.merged;
        sum.alreadySeller += r.alreadySeller;
        sum.skippedNoPhone += r.skippedNoPhone;
        sum.landlineOnly += r.landlineOnly;
        sum.skipped.push(...r.skipped);
      }
      setImportResult({ label, result: sum });
      setPage(0);
      void load();
    } catch (e) {
      notifyError(e);
    } finally {
      setBusyImport(false);
    }
  };

  const onKafnetFile = async (file: File) => {
    try {
      const text = await file.text();
      // raw: numaralar sayıya çevrilmesin ("0506…" baştaki sıfırı kaybetmesin).
      const wb = XLSX.read(text, { type: 'string', raw: true });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const records = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { raw: false, defval: '' });
      const rows: OutreachImportRow[] = records
        .filter((r) => (r.isim || '').trim())
        .map((r) => ({
          name: r.isim.trim(),
          phones: [r.cep_telefonlari, r.telefon, r.sabit_telefonlar].filter(Boolean),
          contacts: r.yetkililer || undefined,
          email: r.eposta || undefined,
          city: r.konum || undefined,
          category: r.kategori || undefined,
          website: r.web_sitesi || undefined,
          description: r.aciklama && r.aciklama !== '-' ? r.aciklama : undefined,
          externalRef: r.url || undefined,
        }));
      await runImport(`Kafnet (${file.name})`, 'KAFNET', rows);
    } catch (e) {
      notifyError(e);
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const todoCount = summary?.byStatus.NEW ?? 0;
  const replied = (summary?.byStatus.REPLIED ?? 0) + (summary?.byStatus.INTERESTED ?? 0);

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }} flexWrap="wrap" useFlexGap>
        <Typography variant="h5" fontWeight={700} sx={{ flex: 1 }}>Satıcı daveti</Typography>
        <Button startIcon={<EditNoteIcon />} onClick={() => setDialog('templates')} disabled={!templates}>Mesaj şablonları</Button>
        <Button startIcon={<AddIcon />} onClick={() => setDialog('manual')}>Elle ekle</Button>
        <Button startIcon={<StorefrontIcon />} onClick={() => setDialog('nartgo')} disabled={busyImport}>NartGo işletmelerini ekle</Button>
        <Button variant="contained" startIcon={busyImport ? <CircularProgress size={16} color="inherit" /> : <UploadFileIcon />} disabled={busyImport} onClick={() => fileRef.current?.click()}>
          Kafnet CSV yükle
        </Button>
        <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => e.target.files?.[0] && onKafnetFile(e.target.files[0])} />
      </Stack>
      <Typography color="text.secondary" sx={{ mb: 2, maxWidth: 960 }}>
        Firmalara WhatsApp'tan NartStore daveti. "WhatsApp'ta aç" sohbeti hazır mesajla açar; gönder tuşuna siz basarsınız ve kayıt "Mesaj Gönderildi" olur.
        Yanıtları WhatsApp'ta okuyup durumu buradan güncelleyin. Aynı numara listeye iki kez girmez; zaten NartStore'da mağazası olanlar "Mağaza Açtı" olarak gelir.
      </Typography>

      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        <Stat label="Yazılacak" value={todoCount} hint={summary?.landlineOnly ? `${summary.landlineOnly} kaydın yalnız sabit hattı var` : undefined} />
        <Stat label="Bugün yazılan" value={summary?.sentToday ?? '–'} hint={`Son 7 gün: ${summary?.sentWeek ?? '–'}`} tone={(summary?.sentToday ?? 0) >= DAILY_SOFT_LIMIT ? 'warning' : undefined} />
        <Stat label="Yanıt veren" value={replied} hint={`${summary?.byStatus.INTERESTED ?? 0} ilgileniyor`} />
        <Stat label="Mağaza açan" value={summary?.byStatus.SELLER ?? '–'} tone="success" />
      </Stack>

      {(summary?.sentToday ?? 0) >= DAILY_SOFT_LIMIT && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Bugün {summary?.sentToday} kişiye yazıldı. WhatsApp, kısa sürede tanımadığı çok sayıda kişiye yazan numarayı kısıtlayabiliyor; kalanı yarına bırakmanız önerilir.
        </Alert>
      )}
      {importResult && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setImportResult(null)}>
          <strong>{importResult.label}:</strong> {importResult.result.created} yeni kayıt, {importResult.result.merged} kayıt zaten listedeydi (eksik bilgileri tamamlandı)
          {importResult.result.alreadySeller > 0 && `, ${importResult.result.alreadySeller} tanesinin NartStore'da mağazası var`}
          {importResult.result.skippedNoPhone > 0 && `, ${importResult.result.skippedNoPhone} satırda kullanılabilir numara yok`}
          {importResult.result.landlineOnly > 0 && `, ${importResult.result.landlineOnly} kaydın yalnız sabit hattı var (WhatsApp düğmesi çıkmaz)`}.
          {importResult.result.skipped.length > 0 && (
            <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>Numarasız: {importResult.result.skipped.slice(0, 15).join(', ')}{importResult.result.skipped.length > 15 ? ' …' : ''}</Typography>
          )}
        </Alert>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Tabs value={tab} onChange={(_, v) => { setTab(v); setPage(0); }} variant="scrollable" sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        {TABS.map((t) => {
          const n = t.key === 'TODO' ? todoCount : t.key === 'ALL' ? undefined : summary?.byStatus[t.key as OutreachStatus];
          return <Tab key={t.key} value={t.key} label={n != null ? `${t.label} (${n})` : t.label} />;
        })}
      </Tabs>

      <Stack direction="row" spacing={1.5} sx={{ mb: 1.5 }} alignItems="center" flexWrap="wrap" useFlexGap>
        <TextField
          size="small"
          placeholder="Firma, kişi, şehir, kategori ya da numara"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          sx={{ minWidth: 300 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
        />
        <TextField select size="small" label="Kaynak" value={source} onChange={(e) => { setSource(e.target.value); setPage(0); }} sx={{ minWidth: 170 }}>
          <MenuItem value="ALL">Hepsi</MenuItem>
          <MenuItem value="KAFNET">Kafnet {summary?.bySource.KAFNET ? `(${summary.bySource.KAFNET})` : ''}</MenuItem>
          <MenuItem value="NARTGO">NartGo işletmesi {summary?.bySource.NARTGO ? `(${summary.bySource.NARTGO})` : ''}</MenuItem>
          <MenuItem value="MANUAL">Elle eklenen {summary?.bySource.MANUAL ? `(${summary.bySource.MANUAL})` : ''}</MenuItem>
        </TextField>
        <FormControlLabel
          control={<Switch checked={whatsappOnly} onChange={(e) => { setWhatsappOnly(e.target.checked); setPage(0); }} />}
          label="Yalnız WhatsApp'a uygun numaralar"
        />
        <Box sx={{ flex: 1 }} />
        <Button startIcon={<RefreshIcon />} onClick={() => void load()}>Yenile</Button>
      </Stack>

      <Paper variant="outlined" sx={{ borderRadius: 2, overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 980 }}>
          <TableHead>
            <TableRow>
              <TableCell>Firma</TableCell>
              <TableCell>Yetkili</TableCell>
              <TableCell>Numara</TableCell>
              <TableCell>Durum</TableCell>
              <TableCell>Son mesaj</TableCell>
              <TableCell align="right">İşlem</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items === null ? (
              <TableRow><TableCell colSpan={6} align="center" sx={{ py: 5 }}><CircularProgress size={24} /></TableCell></TableRow>
            ) : items.length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                {total === 0 && tab === 'TODO' && !query ? 'Yazılacak kayıt yok. Kafnet CSV yükleyin ya da NartGo işletmelerini ekleyin.' : 'Bu filtrede kayıt yok.'}
              </TableCell></TableRow>
            ) : (
              items.map((c) => (
                <TableRow key={c.id} hover>
                  <TableCell sx={{ maxWidth: 320 }}>
                    <Tooltip title={c.summary || ''} placement="top-start" disableHoverListener={!c.summary}>
                      <Typography variant="body2" fontWeight={600}>{c.name}</Typography>
                    </Tooltip>
                    <Typography variant="caption" color="text.secondary" display="block" noWrap>
                      {[SOURCE_LABEL[c.source], c.city, c.category].filter(Boolean).join(' · ')}
                    </Typography>
                    {c.website && (
                      <Typography variant="caption" component="a" href={c.website} target="_blank" rel="noreferrer" sx={{ color: 'primary.main' }}>
                        {c.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                      </Typography>
                    )}
                    {c.notes && <Typography variant="caption" display="block" sx={{ mt: 0.5, fontStyle: 'italic' }}>Not: {c.notes}</Typography>}
                  </TableCell>
                  <TableCell>{c.contactPerson || <Typography variant="caption" color="text.secondary">—</Typography>}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatPhone(c.phone)}</Typography>
                    {c.phoneKind === 'LANDLINE' && <Chip size="small" label="Sabit Hat" sx={{ mt: 0.5 }} />}
                    {c.phoneKind === 'FOREIGN' && <Chip size="small" label="Yurt Dışı" variant="outlined" sx={{ mt: 0.5 }} />}
                    {c.altPhones.length > 0 && (
                      <Tooltip title={c.altPhones.map(formatPhone).join(', ')}>
                        <Typography variant="caption" color="text.secondary" display="block">+{c.altPhones.length} numara daha</Typography>
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell>
                    <TextField
                      select
                      size="small"
                      value={c.status}
                      onChange={(e) => void setStatus(c, e.target.value as OutreachStatus)}
                      sx={{ minWidth: 170 }}
                      SelectProps={{ renderValue: (v) => <Chip size="small" color={STATUS_META[v as OutreachStatus].color} label={STATUS_META[v as OutreachStatus].label} /> }}
                    >
                      {(Object.keys(STATUS_META) as OutreachStatus[]).map((s) => (
                        <MenuItem key={s} value={s}>{STATUS_META[s].label}</MenuItem>
                      ))}
                    </TextField>
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {c.lastSentAt ? (
                      <>
                        <Typography variant="body2">{fmtTime(c.lastSentAt)}</Typography>
                        <Typography variant="caption" color="text.secondary">{c.sentCount} kez{c.lastActionBy ? ` · ${c.lastActionBy}` : ''}</Typography>
                      </>
                    ) : <Typography variant="caption" color="text.secondary">Henüz yok</Typography>}
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <Tooltip title={c.canWhatsApp ? '' : 'Sabit hat: WhatsApp\'ta açılamaz. Notlardan cep numarası ekleyin.'}>
                      <span>
                        <Button
                          size="small"
                          variant={c.status === 'NEW' ? 'contained' : 'outlined'}
                          color="success"
                          startIcon={<WhatsAppIcon />}
                          disabled={!c.canWhatsApp || !templates}
                          onClick={() => void openWhatsApp(c)}
                        >
                          WhatsApp'ta aç
                        </Button>
                      </span>
                    </Tooltip>
                    <Tooltip title="Not ve numara">
                      <IconButton size="small" onClick={() => setNoteFor(c)}><EditNoteIcon fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title="Listeden sil">
                      <IconButton size="small" onClick={() => void remove(c)}><DeleteOutlineIcon fontSize="small" /></IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={total}
          page={page}
          rowsPerPage={50}
          rowsPerPageOptions={[50]}
          onPageChange={(_, p) => setPage(p)}
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}`}
        />
      </Paper>

      {dialog === 'templates' && templates && (
        <TemplatesDialog
          templates={templates}
          onClose={() => setDialog(null)}
          onSaved={(t) => { setTemplates(t); setDialog(null); enqueueSnackbar('Şablonlar kaydedildi', { variant: 'success' }); }}
          onError={notifyError}
        />
      )}
      {dialog === 'nartgo' && (
        <NartGoImportDialog
          onClose={() => setDialog(null)}
          onImport={async (rows, label) => { setDialog(null); await runImport(label, 'NARTGO', rows); }}
          onError={notifyError}
        />
      )}
      {dialog === 'manual' && (
        <ManualDialog
          onClose={() => setDialog(null)}
          onImport={async (row) => { setDialog(null); await runImport(`Elle: ${row.name}`, 'MANUAL', [row]); }}
        />
      )}
      {noteFor && (
        <NoteDialog
          contact={noteFor}
          onClose={() => setNoteFor(null)}
          onSaved={(c) => { replaceItem(c); setNoteFor(null); }}
          onError={notifyError}
        />
      )}
    </Box>
  );
}

function Stat({ label, value, hint, tone }: { label: string; value: string | number; hint?: string; tone?: 'warning' | 'success' }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, minWidth: 170, flex: 1, borderColor: tone === 'warning' ? 'warning.main' : undefined }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="h5" fontWeight={700} color={tone === 'success' ? 'success.main' : tone === 'warning' ? 'warning.main' : undefined}>{value}</Typography>
      {hint && <Typography variant="caption" color="text.secondary">{hint}</Typography>}
    </Paper>
  );
}

function TemplatesDialog({ templates, onClose, onSaved, onError }: {
  templates: OutreachTemplates;
  onClose: () => void;
  onSaved: (t: OutreachTemplates) => void;
  onError: (e: unknown) => void;
}) {
  const [active, setActive] = useState<OutreachSource>('KAFNET');
  const [draft, setDraft] = useState<Record<OutreachSource, string>>({ KAFNET: templates.KAFNET, NARTGO: templates.NARTGO, MANUAL: templates.MANUAL });
  const [saving, setSaving] = useState(false);
  const preview = useMemo(() => renderTemplate(draft[active], { name: 'Örnek Mobilya', contactPerson: 'Ahmet Yılmaz' }), [draft, active]);

  const save = async () => {
    setSaving(true);
    try {
      onSaved(await sellerOutreachService.saveTemplates(draft));
    } catch (e) {
      onError(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Mesaj şablonları</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Her kaynak için ayrı metin. <code>{'{firma}'}</code> firma adıyla, <code>{'{yetkili}'}</code> varsa yetkili adıyla dolar.
          Firma adından sonra ek ("'nı", "'ya") yazmayın: ada göre değişir, yanlış düşer.
        </Typography>
        <Tabs value={active} onChange={(_, v) => setActive(v)} sx={{ mb: 2 }}>
          <Tab value="KAFNET" label="Kafnet firmaları" />
          <Tab value="NARTGO" label="NartGo işletmeleri" />
          <Tab value="MANUAL" label="Elle eklenenler" />
        </Tabs>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            multiline
            minRows={14}
            fullWidth
            value={draft[active]}
            onChange={(e) => setDraft((d) => ({ ...d, [active]: e.target.value }))}
            helperText={`${draft[active].length} karakter`}
          />
          <Paper variant="outlined" sx={{ p: 2, flex: 1, bgcolor: '#e7ffdb', whiteSpace: 'pre-wrap', fontSize: 14, borderRadius: 2, minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>Önizleme (örnek firma)</Typography>
            {preview}
          </Paper>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setDraft((d) => ({ ...d, [active]: templates.defaults[active] }))}>Bu sekmeyi varsayılana döndür</Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose}>Vazgeç</Button>
        <Button variant="contained" onClick={save} disabled={saving || !draft[active].includes('{firma}')}>Kaydet</Button>
      </DialogActions>
    </Dialog>
  );
}

/**
 * NartGo işletmeleri: işletmenin WhatsApp numarası, yoksa telefonu. "Sahibi olanlar" yalnız sahiplenme
 * onayı almış işletmeler; diğerleri topluluğun eklediği kayıtlar (işletme uygulamayı bilmiyor olabilir).
 */
function NartGoImportDialog({ onClose, onImport, onError }: {
  onClose: () => void;
  onImport: (rows: OutreachImportRow[], label: string) => Promise<void>;
  onError: (e: unknown) => void;
}) {
  const [scope, setScope] = useState<'claimed' | 'all'>('claimed');
  const [loading, setLoading] = useState(true);
  const [all, setAll] = useState<{ row: OutreachImportRow; claimed: boolean }[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const out: { row: OutreachImportRow; claimed: boolean }[] = [];
        for (let page = 0; page < 50; page++) {
          const res = await businessService.getAllBusinesses({ page, size: 100, sortBy: 'name' });
          const data = (res as { data?: { content?: unknown[]; last?: boolean } })?.data;
          const content = (data?.content || []) as BusinessDto[];
          for (const b of content) {
            if (!b?.name) continue;
            out.push({
              claimed: b.claimStatus === 'APPROVED' && !!b.ownerId,
              row: {
                name: String(b.name),
                phones: [b.whatsappNumber, b.phoneNumber].filter((x): x is string => !!x),
                email: b.email || undefined,
                city: b.address?.city || undefined,
                category: b.categoryName || undefined,
                website: b.website || undefined,
                description: b.shortDescription || b.description || undefined,
                externalRef: String(b.id),
              },
            });
          }
          if (data?.last !== false || content.length === 0) break;
        }
        if (alive) setAll(out);
      } catch (e) {
        onError(e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [onError]);

  const chosen = all.filter((x) => scope === 'all' || x.claimed);
  const withPhone = chosen.filter((x) => x.row.phones.length > 0);

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>NartGo işletmelerini ekle</DialogTitle>
      <DialogContent>
        {loading ? (
          <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress size={24} /><Typography variant="caption" sx={{ mt: 1 }}>İşletmeler alınıyor…</Typography></Stack>
        ) : (
          <>
            <RadioGroup value={scope} onChange={(e) => setScope(e.target.value as 'claimed' | 'all')}>
              <FormControlLabel value="claimed" control={<Radio />} label={`Yalnız sahibi doğrulanmış işletmeler (${all.filter((x) => x.claimed).length})`} />
              <FormControlLabel value="all" control={<Radio />} label={`Tüm işletmeler (${all.length})`} />
            </RadioGroup>
            <Typography variant="body2" sx={{ mt: 1 }}>
              {withPhone.length} işletmenin numarası var. WhatsApp numarası varsa o, yoksa işletme telefonu kullanılır. Zaten listede olan numaralar yeniden eklenmez;
              NartStore'da mağazası olanlar "Mağaza Açtı" olarak gelir.
            </Typography>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Vazgeç</Button>
        <Button
          variant="contained"
          disabled={loading || withPhone.length === 0}
          onClick={() => void onImport(withPhone.map((x) => x.row), scope === 'claimed' ? 'NartGo (sahibi doğrulanmış)' : 'NartGo (tüm işletmeler)')}
        >
          {withPhone.length} işletmeyi ekle
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ManualDialog({ onClose, onImport }: { onClose: () => void; onImport: (row: OutreachImportRow) => Promise<void> }) {
  const [form, setForm] = useState({ name: '', phone: '', contactPerson: '', city: '', category: '' });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const valid = form.name.trim() && form.phone.replace(/\D/g, '').length >= 10;
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Elle ekle</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Firma adı" value={form.name} onChange={set('name')} required autoFocus />
          <TextField label="Telefon" value={form.phone} onChange={set('phone')} required helperText="Türkiye numarası 05… diye; yurt dışı +ülke koduyla" />
          <TextField label="Yetkili (isteğe bağlı)" value={form.contactPerson} onChange={set('contactPerson')} />
          <TextField label="Şehir (isteğe bağlı)" value={form.city} onChange={set('city')} />
          <TextField label="Ne satıyor (isteğe bağlı)" value={form.category} onChange={set('category')} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Vazgeç</Button>
        <Button
          variant="contained"
          disabled={!valid}
          onClick={() => void onImport({
            name: form.name.trim(),
            phones: [form.phone],
            contactPerson: form.contactPerson || undefined,
            city: form.city || undefined,
            category: form.category || undefined,
          })}
        >
          Ekle
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function NoteDialog({ contact, onClose, onSaved, onError }: {
  contact: OutreachContact;
  onClose: () => void;
  onSaved: (c: OutreachContact) => void;
  onError: (e: unknown) => void;
}) {
  const [notes, setNotes] = useState(contact.notes || '');
  const [phone, setPhone] = useState('');
  const [person, setPerson] = useState(contact.contactPerson || '');
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      onSaved(await sellerOutreachService.update(contact.id, {
        notes,
        contactPerson: person,
        ...(phone.trim() ? { phone: phone.trim() } : {}),
      }));
    } catch (e) {
      onError(e);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{contact.name}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Not" value={notes} onChange={(e) => setNotes(e.target.value)} multiline minRows={3} placeholder="Ne yanıt verdi, ne zaman tekrar yazılacak…" />
          <TextField label="Yetkili" value={person} onChange={(e) => setPerson(e.target.value)} />
          <TextField
            label="Numarayı değiştir"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={formatPhone(contact.phone)}
            helperText={contact.altPhones.length ? `Kayıtlı diğer numaralar: ${contact.altPhones.map(formatPhone).join(', ')}` : 'Boş bırakılırsa numara değişmez'}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Vazgeç</Button>
        <Button variant="contained" onClick={save} disabled={saving}>Kaydet</Button>
      </DialogActions>
    </Dialog>
  );
}
