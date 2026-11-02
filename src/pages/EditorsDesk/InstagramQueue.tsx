/**
 * Instagram Kuyruğu — Editor's Desk'ten gelen gönderi paketleri.
 *
 * Desk'te Stüdyo → "Tümü (.zip)" ya da önizlemede "İndir (.zip)" denince paket buraya düşer.
 * Buradan görseller ve açıklama indirilip elle paylaşılabilir, ya da (sunucuda açıksa)
 * Instagram'a hemen gönderilir veya bir saate zamanlanır. Paylaşılan gönderi Desk'te
 * "Yayında" olur ve NartGo'ya makale olarak eklenir.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Link, Paper, Skeleton,
  Stack, TextField, Typography,
} from '@mui/material';
import {
  CameraAlt as InstagramIcon, ContentCopy as CopyIcon, Download as DownloadIcon, Send as SendIcon,
  Schedule as ScheduleIcon, DeleteOutline as DeleteIcon,
} from '@mui/icons-material';
import AdminShell from '../../components/AdminShell';
import { darkAdmin } from '../../theme/darkAdmin';
import { useRole } from '../../hooks/useRole';
import { deskInstagramService, type IgPackage, type IgPackageState } from '../../services/content/deskInstagramService';

const STATE: Record<IgPackageState, { label: string; color: 'default' | 'info' | 'warning' | 'success' | 'error' }> = {
  READY: { label: 'Hazır', color: 'default' },
  SCHEDULED: { label: 'Zamanlandı', color: 'info' },
  PUBLISHING: { label: 'Paylaşılıyor…', color: 'warning' },
  PUBLISHED: { label: 'Paylaşıldı', color: 'success' },
  FAILED: { label: 'Hata', color: 'error' },
};

const when = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
/** datetime-local alanı için tarayıcının yerel saatiyle "YYYY-MM-DDTHH:mm". */
const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const errText = (e: unknown, fallback: string) => ((e as any)?.response?.data?.message as string | undefined) || fallback;

async function downloadAll(p: IgPackage) {
  for (let i = 0; i < p.slides.length; i++) {
    const blob = await (await fetch(p.slides[i])).blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${p.postId}-${String(i + 1).padStart(2, '0')}.jpg`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 30000);
    await new Promise(r => setTimeout(r, 300));
  }
}

function PackageCard({ p, canPublish, enabled, onAction }: {
  p: IgPackage; canPublish: boolean; enabled: boolean;
  onAction: (kind: 'publish' | 'schedule' | 'unschedule' | 'delete', p: IgPackage) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const st = STATE[p.state];
  const open = p.state === 'READY' || p.state === 'FAILED' || p.state === 'SCHEDULED';

  return (
    <Paper variant="outlined" sx={{ p: 2, ...darkAdmin.sx.card }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, flexWrap: 'wrap', rowGap: 1 }}>
        <Typography sx={{ fontWeight: 600, flex: 1, minWidth: 200 }}>{p.title}</Typography>
        <Chip size="small" color={st.color} label={p.state === 'SCHEDULED' ? `${st.label}: ${when(p.scheduledAt)}` : st.label} />
      </Stack>
      <Typography sx={{ fontSize: 12.5, color: darkAdmin.text.secondary, mb: 1.5 }}>
        {[p.format, p.postDate && `plan: ${p.postDate}`, p.postStatus && `Desk: ${p.postStatus}`, `${p.slides.length} slayt`, `paket: ${when(p.updatedAt)}`]
          .filter(Boolean).join(' · ')}
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1, mb: 1.5 }}>
        {p.slides.map((src, i) => (
          <Box key={src} component="a" href={src} target="_blank" rel="noopener" sx={{ flex: '0 0 auto' }}>
            <Box component="img" src={src} alt={`Slayt ${i + 1}`} loading="lazy"
              sx={{ height: 150, borderRadius: 1, display: 'block', border: 1, borderColor: 'divider' }} />
          </Box>
        ))}
      </Box>

      <Typography component="pre" sx={{ fontFamily: 'inherit', fontSize: 13, whiteSpace: 'pre-wrap', m: 0, mb: 1.5, maxHeight: 140, overflow: 'auto' }}>
        {p.caption}
      </Typography>

      {p.state === 'PUBLISHED' && (
        <Alert severity="success" sx={{ mb: 1.5 }}>
          {when(p.publishedAt)} tarihinde paylaşıldı{p.permalink && <> · <Link href={p.permalink} target="_blank" rel="noopener">Instagram'da aç</Link></>}
        </Alert>
      )}
      {p.state === 'FAILED' && p.error && <Alert severity="error" sx={{ mb: 1.5 }}>{p.error}</Alert>}

      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
        <Button size="small" startIcon={<CopyIcon />}
          onClick={async () => { await navigator.clipboard.writeText(p.caption); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
          {copied ? 'Kopyalandı' : 'Metni kopyala'}
        </Button>
        <Button size="small" startIcon={<DownloadIcon />} disabled={busy}
          onClick={async () => { setBusy(true); try { await downloadAll(p); } finally { setBusy(false); } }}>
          Görselleri indir
        </Button>
        <Box sx={{ flex: 1 }} />
        {canPublish && open && (
          <>
            {p.state === 'SCHEDULED'
              ? <Button size="small" onClick={() => onAction('unschedule', p)}>Zamanlamayı kaldır</Button>
              : <Button size="small" startIcon={<ScheduleIcon />} disabled={!enabled} onClick={() => onAction('schedule', p)}>Zamanla</Button>}
            <Button size="small" variant="contained" startIcon={<SendIcon />} disabled={!enabled} onClick={() => onAction('publish', p)}>
              {p.state === 'FAILED' ? 'Yeniden dene' : 'Şimdi paylaş'}
            </Button>
            <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => onAction('delete', p)}>Sil</Button>
          </>
        )}
      </Stack>
    </Paper>
  );
}

export default function InstagramQueue() {
  const qc = useQueryClient();
  const { isAdmin } = useRole();
  const [dialog, setDialog] = useState<{ kind: 'publish' | 'schedule' | 'delete'; p: IgPackage } | null>(null);
  const [at, setAt] = useState('');

  const config = useQuery({ queryKey: ['desk-ig-config'], queryFn: deskInstagramService.config });
  const packages = useQuery({
    queryKey: ['desk-ig-packages'],
    queryFn: deskInstagramService.packages,
    // Paylaşım sürerken sık, yoksa seyrek yenile (yeni paketler Desk'ten gelebilir).
    refetchInterval: q => (q.state.data?.some(p => p.state === 'PUBLISHING') ? 4000 : 30000),
  });

  const action = useMutation({
    mutationFn: async ({ kind, p, date }: { kind: string; p: IgPackage; date?: Date }) => {
      if (kind === 'publish') return deskInstagramService.publish(p.postId);
      if (kind === 'schedule') return deskInstagramService.schedule(p.postId, date!);
      if (kind === 'unschedule') return deskInstagramService.unschedule(p.postId);
      return deskInstagramService.remove(p.postId);
    },
    onSuccess: () => { setDialog(null); qc.invalidateQueries({ queryKey: ['desk-ig-packages'] }); },
  });

  const enabled = !!config.data?.enabled && !!config.data?.configured;
  const list = packages.data ?? [];
  const waiting = list.filter(p => p.state !== 'PUBLISHED');
  const done = list.filter(p => p.state === 'PUBLISHED');

  const onAction = (kind: 'publish' | 'schedule' | 'unschedule' | 'delete', p: IgPackage) => {
    action.reset();
    if (kind === 'unschedule') { action.mutate({ kind, p }); return; }
    if (kind === 'schedule') {
      const base = p.scheduledAt ?? p.defaultAt;
      const d = base && new Date(base).getTime() > Date.now() + 120000 ? new Date(base) : new Date(Date.now() + 3600000);
      setAt(toLocalInput(d));
    }
    setDialog({ kind, p });
  };

  return (
    <AdminShell
      title="Instagram Kuyruğu"
      subtitle="Editor's Desk'ten gelen gönderi paketleri"
      icon={<InstagramIcon sx={{ fontSize: 26 }} />}
      label="İçerik"
      isFetching={packages.isFetching}
      lastUpdatedAt={packages.dataUpdatedAt}
      onRefresh={() => packages.refetch()}
      footerText="Paket eklemek için Editor's Desk'te gönderinin Stüdyo'sunda “Tümü (.zip)” ya da önizlemede “İndir (.zip)” kullan. Aynı gönderi yeniden indirilirse paket güncellenir."
    >
      {config.data && !enabled && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Instagram'a doğrudan paylaşım şu an kapalı
          {config.data.configured ? '' : ' (sunucuda anahtar yok)'}. Görselleri indirip metni kopyalayarak
          Meta Business Suite'te taslak ya da zamanlı paylaşım yapabilirsin.
        </Alert>
      )}
      {!isAdmin && enabled && <Alert severity="info" sx={{ mb: 2 }}>Paylaşma ve zamanlama yalnız yöneticilere açık.</Alert>}
      {packages.error && <Alert severity="error" sx={{ mb: 2 }}>{errText(packages.error, 'Kuyruk yüklenemedi.')}</Alert>}
      {action.error && !dialog && <Alert severity="error" sx={{ mb: 2 }}>{errText(action.error, 'İşlem yapılamadı.')}</Alert>}
      {packages.isLoading && <Stack spacing={2}>{[1, 2].map(i => <Skeleton key={i} variant="rectangular" height={260} sx={{ borderRadius: 2 }} />)}</Stack>}

      {packages.data && !list.length && (
        <Typography sx={{ color: darkAdmin.text.secondary }}>Kuyruk boş. Desk'ten bir gönderinin paketini indirince burada görünür.</Typography>
      )}

      <Stack spacing={2}>
        {waiting.map(p => <PackageCard key={p.postId} p={p} canPublish={isAdmin} enabled={enabled} onAction={onAction} />)}
      </Stack>
      {done.length > 0 && (
        <>
          <Typography sx={{ ...darkAdmin.sx.sectionLabel, mt: 4, mb: 1.5 }}>Paylaşılanlar</Typography>
          <Stack spacing={2}>
            {done.map(p => <PackageCard key={p.postId} p={p} canPublish={isAdmin} enabled={enabled} onAction={onAction} />)}
          </Stack>
        </>
      )}

      <Dialog open={!!dialog} onClose={() => !action.isPending && setDialog(null)} maxWidth="xs" fullWidth>
        {dialog && (
          <>
            <DialogTitle>
              {dialog.kind === 'publish' ? "Instagram'da paylaşılsın mı?" : dialog.kind === 'schedule' ? 'Paylaşımı zamanla' : 'Paket silinsin mi?'}
            </DialogTitle>
            <DialogContent>
              <Typography sx={{ fontWeight: 600, mb: 1 }}>{dialog.p.title}</Typography>
              {dialog.kind === 'publish' && (
                <Typography sx={{ fontSize: 14 }}>
                  {dialog.p.slides.length} slayt @nartgo hesabında hemen yayınlanır. Bu geri alınamaz; gönderi Desk'te
                  “Yayında” olur ve NartGo'ya makale olarak eklenir.
                </Typography>
              )}
              {dialog.kind === 'schedule' && (
                <>
                  <TextField type="datetime-local" fullWidth value={at} onChange={e => setAt(e.target.value)} sx={{ mt: 1 }}
                    helperText="Sunucu bu saatte (en geç bir dakika içinde) paylaşır." />
                </>
              )}
              {dialog.kind === 'delete' && <Typography sx={{ fontSize: 14 }}>Görseller sunucudan silinir. Desk'teki gönderi etkilenmez.</Typography>}
              {action.error && <Alert severity="error" sx={{ mt: 2 }}>{errText(action.error, 'İşlem yapılamadı.')}</Alert>}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialog(null)} disabled={action.isPending}>Vazgeç</Button>
              <Button variant="contained" color={dialog.kind === 'delete' ? 'error' : 'primary'} disabled={action.isPending || (dialog.kind === 'schedule' && !at)}
                onClick={() => action.mutate({ kind: dialog.kind, p: dialog.p, date: dialog.kind === 'schedule' ? new Date(at) : undefined })}>
                {dialog.kind === 'publish' ? 'Paylaş' : dialog.kind === 'schedule' ? 'Zamanla' : 'Sil'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </AdminShell>
  );
}
