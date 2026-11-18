import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { MoreVert as MoreIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { au } from '../../theme/adminUsers';
import { UserOverview, userSearchService } from '../../services/user/userSearchService';
import { userService } from '../../services/user/userService';
import type { ActivityLogItem, AdminNote } from '../../types/users/userModel';
import { AGE_LABEL, TYPE_LABEL } from './userFilters';
import { StatusBadge } from './userUi';
import { initials, timeAgo } from './userFormat';

/**
 * Kullanıcı detayı başlık kartı ve "Genel" sekmesi (tasarım ekran 3, docs/plan/admin-kullanicilar.md).
 * Hassas veriler indirgenir: yaş aralığı, il düzeyi konum, maskeli telefon. Ham değerler yalnız "Düzenle"de.
 */

const card = { bgcolor: au.surface, border: `1px solid ${au.border}`, borderRadius: '18px', p: 2.5 } as const;
const h2 = { fontSize: 17, fontWeight: 800, color: au.text } as const;

const CHECK_LABEL: Record<string, string> = {
  photo: 'Profil fotoğrafı',
  village: 'Memleket ve köy',
  family: 'Sülale',
  birthYear: 'Doğum yılı',
  email: 'E-posta doğrulı',
  name: 'Ad soyad',
};

const LANG: Record<string, string> = { TR: 'Türkçe', EN: 'İngilizce', RU: 'Rusça', AR: 'Arapça' };

function fmtDate(iso?: string | null) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function Badge({ children, tone }: { children: React.ReactNode; tone: 'info' | 'green' | 'gold' | 'grey' }) {
  const t = {
    info: { border: `1px solid ${au.infoBorder}`, color: au.infoText, bg: 'transparent', r: '6px' },
    green: { border: 0, color: au.primary, bg: au.primaryTintStrong, r: '999px' },
    gold: { border: 0, color: au.goldText, bg: au.goldTint, r: '999px' },
    grey: { border: `1px solid ${au.chipBorder}`, color: au.muted, bg: 'transparent', r: '6px' },
  }[tone];
  return (
    <Box component="span" sx={{ border: t.border, color: t.color, bgcolor: t.bg, borderRadius: t.r, px: 1.25, py: '2px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {children}
    </Box>
  );
}

export function UserDetailHeader({
  o,
  onEdit,
  onNotify,
  onPasswordReset,
  onPhotoRemoved,
}: {
  o: UserOverview | null;
  onEdit: () => void;
  onNotify: () => void;
  onPasswordReset: () => void;
  onPhotoRemoved: () => void;
}) {
  const { enqueueSnackbar } = useSnackbar();
  const [phone, setPhone] = useState<string | null>(null);
  const [menu, setMenu] = useState<HTMLElement | null>(null);
  const [confirmPhoto, setConfirmPhoto] = useState(false);

  useEffect(() => setPhone(null), [o?.id]);

  if (!o) return <Box sx={card}><Skeleton height={140} /></Box>;

  const reveal = async () => {
    try {
      setPhone(await userSearchService.revealPhone(o.id));
    } catch {
      enqueueSnackbar('Telefon gösterilemedi', { variant: 'error' });
    }
  };

  const removePhoto = async () => {
    try {
      const full = await userService.getUserAdmin(o.id);
      // null açıkça gönderilir: undefined JSON'a yazılmaz ve fotoğraf silinmez.
      await userService.updateUserAdmin(o.id, { ...full.data, imageUrl: null } as unknown as typeof full.data);
      enqueueSnackbar('Fotoğraf kaldırıldı', { variant: 'success' });
      onPhotoRemoved();
    } catch {
      enqueueSnackbar('Fotoğraf kaldırılamadı', { variant: 'error' });
    } finally {
      setConfirmPhoto(false);
    }
  };

  const stat = (label: string, value: React.ReactNode) => (
    <Box>
      <Typography sx={{ fontSize: 12, color: au.muted }}>{label}</Typography>
      <Typography sx={{ fontWeight: 700 }}>{value}</Typography>
    </Box>
  );

  return (
    <Box component="section" sx={{ ...card, p: 3, display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
      <Stack alignItems="center" spacing={1}>
        <Avatar src={o.imageUrl ?? undefined} alt="" variant="rounded"
          sx={{ width: 112, height: 112, borderRadius: '28px', bgcolor: o.imageUrl ? au.avatar : au.avatarSoft, color: au.primary, fontSize: 36, fontWeight: 800 }}>
          {initials(o.name || o.email) || undefined}
        </Avatar>
        {o.imageUrl && (
          <Button onClick={() => setConfirmPhoto(true)} sx={{ minHeight: 36, color: au.danger, fontSize: 12.5, fontWeight: 600, textTransform: 'none' }}>
            Fotoğrafı kaldır
          </Button>
        )}
      </Stack>
      <Stack spacing={1.25} sx={{ flex: '1 1 420px', minWidth: 0 }}>
        <Stack direction="row" alignItems="center" gap={1.25} flexWrap="wrap">
          <Typography component="h1" sx={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.01em' }}>{o.name || o.email}</Typography>
          <StatusBadge status={o.status} />
          <Badge tone="info">{TYPE_LABEL[o.accountType] ?? o.accountType}</Badge>
          {o.isAdmin && <Badge tone="info">Yönetici</Badge>}
          {o.familyTrust === 'verified' && <Badge tone="green">Teyitli köylü</Badge>}
        </Stack>
        <Stack direction="row" gap={2.75} flexWrap="wrap" alignItems="center" sx={{ color: au.textSoft }}>
          <span>{o.email}</span>
          {o.hasPhone && (
            <span>
              {phone ?? o.phoneMasked}
              {!phone && (
                <Button onClick={reveal} sx={{ minHeight: 32, px: 0.75, color: au.primary, fontWeight: 700, textTransform: 'none' }}
                  aria-label="Telefonu göster (denetim kaydına yazılır)">
                  Göster
                </Button>
              )}
            </span>
          )}
          <Box component="span" sx={{ color: au.muted }}>
            ID: {o.id.slice(0, 4)}…{o.id.slice(-4)}
            <Button onClick={() => { navigator.clipboard?.writeText(o.id); enqueueSnackbar('Kimlik kopyalandı', { variant: 'info' }); }}
              sx={{ minHeight: 32, px: 0.75, color: au.primary, fontWeight: 700, textTransform: 'none' }}>
              Kopyala
            </Button>
          </Box>
        </Stack>
        <Stack direction="row" gap={4} flexWrap="wrap">
          {stat('Kayıt', fmtDate(o.createdAt))}
          {stat('Son giriş', timeAgo(o.lastLoginAt))}
          {stat('Toplam giriş', o.loginCount.toLocaleString('tr-TR'))}
          {stat('Platform puanı', `${o.points.toLocaleString('tr-TR')} XP`)}
        </Stack>
      </Stack>
      <Stack direction="row" gap={1.25} flexWrap="wrap">
        <Button variant="contained" disableElevation onClick={onEdit}
          sx={{ height: 46, px: 2.5, bgcolor: au.primary, borderRadius: '12px', fontWeight: 700, textTransform: 'none', '&:hover': { bgcolor: au.primaryDark } }}>
          Düzenle
        </Button>
        <Button variant="outlined" onClick={onNotify}
          sx={{ height: 46, px: 2.25, color: au.primary, borderColor: au.primary, borderWidth: 1.5, borderRadius: '12px', fontWeight: 700, textTransform: 'none' }}>
          Bildirim gönder
        </Button>
        <IconButton aria-label="Diğer işlemler" onClick={(e) => setMenu(e.currentTarget)}
          sx={{ width: 46, height: 46, border: `1px solid ${au.inputBorder}`, borderRadius: '12px' }}>
          <MoreIcon />
        </IconButton>
        <Menu anchorEl={menu} open={!!menu} onClose={() => setMenu(null)}>
          <MenuItem onClick={() => { setMenu(null); onPasswordReset(); }}>Şifre sıfırlama bağlantısı gönder</MenuItem>
          <MenuItem onClick={() => { setMenu(null); navigator.clipboard?.writeText(o.email); }}>E-postayı kopyala</MenuItem>
        </Menu>
      </Stack>

      <Dialog open={confirmPhoto} onClose={() => setConfirmPhoto(false)}>
        <DialogTitle>Profil fotoğrafı kaldırılsın mı?</DialogTitle>
        <DialogContent><Typography>Fotoğraf kullanıcının profilinden kalkar. Kullanıcı yenisini yükleyebilir.</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmPhoto(false)}>Vazgeç</Button>
          <Button color="error" variant="contained" onClick={removePhoto}>Kaldır</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/** Memleket ve sülale kartı; "Memleket ve sülale" sekmesinde de kullanılır. */
export function HometownCard({ o, onEdit }: { o: UserOverview; onEdit: () => void }) {
  const v = o.village;
  return (
    <Box component="section" sx={{ ...card, display: 'flex', flexDirection: 'column', gap: 1.75 }}>
      <Stack direction="row" alignItems="baseline" justifyContent="space-between">
        <Typography component="h2" sx={h2}>Memleket ve sülale</Typography>
        <Button onClick={onEdit} sx={{ color: au.primary, fontWeight: 700, textTransform: 'none' }}>Düzenle</Button>
      </Stack>
      {v ? (
        <Stack direction="row" alignItems="center" gap={1.75} flexWrap="wrap" sx={{ bgcolor: au.page, borderRadius: '14px', px: 2, py: 1.75 }}>
          <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: au.primary, color: au.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }} aria-hidden>
            ⌂
          </Box>
          <Box sx={{ flex: 1, minWidth: 160 }}>
            <Typography sx={{ fontWeight: 800, fontSize: 16 }}>{v.name}</Typography>
            <Typography sx={{ color: au.muted, fontSize: 13 }}>
              {[v.district, v.province, o.villageVerified ? 'konum teyitli' : null].filter(Boolean).join(' · ')}
            </Typography>
          </Box>
          <Button component={RouterLink} to={`/heritage/villages?village=${v.id}`} sx={{ minHeight: 40, color: au.primary, fontWeight: 700, textTransform: 'none' }}>
            Köy sayfasını aç
          </Button>
        </Stack>
      ) : (
        <Typography sx={{ color: au.placeholder }}>{o.hometownCity ? `Memleket: ${o.hometownCity} (köy seçilmemiş)` : 'Köy seçilmemiş'}</Typography>
      )}
      <Stack spacing={1}>
        <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: au.muted }}>SÜLALE</Typography>
        {o.familyName ? (
          <Stack direction="row" gap={1} flexWrap="wrap">
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, minHeight: 40, pl: 1.75, pr: 1, bgcolor: au.cream, borderRadius: 999, fontWeight: 700 }}>
              {o.familyName}
              {o.familyTrust === 'verified' ? <Badge tone="green">Köylü teyitli</Badge> : <Badge tone="gold">Beklemede</Badge>}
            </Box>
          </Stack>
        ) : (
          <Typography sx={{ color: au.placeholder }}>Sülale eklenmemiş</Typography>
        )}
      </Stack>
      <Stack direction="row" gap={3.5} flexWrap="wrap" sx={{ borderTop: `1px solid ${au.borderSoft}`, pt: 1.5, fontSize: 13, color: au.textSoft }}>
        <span>Verdiği teyit: <strong>{o.confirmsGiven}</strong></span>
        <span>İtiraz: <strong>{o.disputesGiven}</strong></span>
        <span>Eklediği sülale: <strong>{o.familiesAdded}</strong></span>
      </Stack>
    </Box>
  );
}

export function UserGeneralTab({
  o,
  notes,
  onAddNote,
  onEdit,
  onBlock,
  onDelete,
}: {
  o: UserOverview;
  notes: AdminNote[];
  onAddNote: (text: string) => Promise<void>;
  onEdit: () => void;
  onBlock: (reason: string, unblock: boolean) => Promise<void>;
  onDelete: (reason: string) => Promise<void>;
}) {
  const [events, setEvents] = useState<ActivityLogItem[] | null>(null);
  const [note, setNote] = useState('');
  const [risk, setRisk] = useState<null | 'block' | 'delete'>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const blocked = o.status === 'BLOCKED';

  useEffect(() => {
    userService.getActivityLog(o.id, 5).then((r) => setEvents(r.data ?? [])).catch(() => setEvents([]));
  }, [o.id]);

  const row = (label: string, value: React.ReactNode, last = false) => (
    <>
      <Box sx={{ py: 1.5, color: au.muted, borderBottom: last ? 0 : `1px solid ${au.borderSoft}` }}>{label}</Box>
      <Box sx={{ py: 1.5, fontWeight: 600, borderBottom: last ? 0 : `1px solid ${au.borderSoft}` }}>{value}</Box>
    </>
  );

  const [first, ...rest] = (o.name || '').split(' ');
  const done = o.checks.filter((c) => c.done).length;

  const confirmRisk = async () => {
    if (reason.trim().length < 5) return;
    setBusy(true);
    try {
      if (risk === 'block') await onBlock(reason.trim(), blocked);
      if (risk === 'delete') await onDelete(reason.trim());
      setRisk(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <Stack spacing={2.5} sx={{ flex: '2 1 560px', minWidth: 0 }}>
        <Box component="section" sx={{ ...card, display: 'flex', flexDirection: 'column', gap: 1.75 }}>
          <Stack direction="row" alignItems="baseline" justifyContent="space-between">
            <Typography component="h2" sx={h2}>Profil doluluğu</Typography>
            <Typography sx={{ fontSize: 20, fontWeight: 800, color: au.primary }}>%{o.profileScore}</Typography>
          </Stack>
          <Box sx={{ height: 8, bgcolor: au.border, borderRadius: 4 }} role="img" aria-label={`Profil yüzde ${o.profileScore}, ${done} / ${o.checks.length} tamam`}>
            <Box sx={{ width: `${o.profileScore}%`, height: 8, bgcolor: au.success, borderRadius: 4 }} />
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px 20px' }}>
            {o.checks.map((c) => (
              <Stack key={c.key} direction="row" alignItems="center" gap={1.25} sx={{ minHeight: 36, color: c.done ? au.text : au.warningText }}>
                <Box sx={{ width: 22, height: 22, borderRadius: '50%', bgcolor: c.done ? au.primaryTintStrong : au.goldTint, color: c.done ? au.primary : au.warningText,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }} aria-hidden>
                  {c.done ? '✓' : '!'}
                </Box>
                {c.done ? CHECK_LABEL[c.key] : `${CHECK_LABEL[c.key]} eksik`}
              </Stack>
            ))}
          </Box>
        </Box>

        <HometownCard o={o} onEdit={onEdit} />

        <Box component="section" sx={card}>
          <Typography component="h2" sx={{ ...h2, mb: 1 }}>Kişisel bilgiler</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '160px 1fr', borderTop: `1px solid ${au.borderSoft}` }}>
            {row('Ad', first || '-')}
            {row('Soyad', rest.join(' ') || '-')}
            {row('Yaş aralığı', o.ageBand === 'unknown' ? 'Belirtmemiş' : AGE_LABEL[o.ageBand] ?? o.ageBand)}
            {row('Şu anki konum', <>{o.currentCity || 'Bilinmiyor'} <Box component="span" sx={{ fontWeight: 400, color: au.muted }}>· yalnız il düzeyi</Box></>)}
            {row('Dil', LANG[o.language ?? ''] ?? o.language ?? '-', true)}
          </Box>
        </Box>
      </Stack>

      <Stack spacing={2.5} sx={{ flex: '1 1 340px', minWidth: 0 }}>
        <Box component="section" sx={{ ...card, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Typography component="h2" sx={h2}>Hesap</Typography>
          {[
            ['Durum', <StatusBadge key="s" status={o.status} />],
            ['Hesap türü', TYPE_LABEL[o.accountType] ?? o.accountType],
            ['Rol', o.isAdmin ? 'Yönetici' : 'Kullanıcı'],
            ['Kimlik sağlayıcı', o.identityProvider],
            ['Etiketler', o.tags.length ? o.tags.join(', ') : '-'],
          ].map(([l, v]) => (
            <Stack key={l as string} direction="row" justifyContent="space-between" alignItems="center" sx={{ minHeight: 40 }}>
              <Typography sx={{ color: au.muted }}>{l}</Typography>
              <Box sx={{ fontWeight: 600 }}>{v}</Box>
            </Stack>
          ))}
        </Box>

        <Box component="section" sx={{ ...card, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Typography component="h2" sx={{ ...h2, mb: 1 }}>Son hareketler</Typography>
          {events === null ? (
            <Skeleton height={120} />
          ) : events.length === 0 ? (
            <Typography sx={{ color: au.muted }}>Kayıtlı hareket yok.</Typography>
          ) : (
            events.map((e, i) => (
              <Stack key={e.eventId ?? i} direction="row" gap={1.5} sx={{ py: 1.25, borderTop: `1px solid ${au.borderSoft}` }}>
                <Box sx={{ width: 8, height: 8, mt: '7px', borderRadius: '50%', flex: 'none', bgcolor: e.status === 'SUCCESS' ? au.success : au.warning }} />
                <Box>
                  <Typography sx={{ fontWeight: 600 }}>{EVENT_LABEL[e.eventType ?? ''] ?? e.eventType ?? 'Hareket'}</Typography>
                  <Typography sx={{ fontSize: 12.5, color: au.muted }}>{[timeAgo(e.createdAt), e.device, e.city].filter(Boolean).join(' · ')}</Typography>
                </Box>
              </Stack>
            ))
          )}
        </Box>

        <Box component="section" sx={{ ...card, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          <Typography component="h2" sx={h2}>Yönetici notları</Typography>
          <TextField multiline minRows={3} placeholder="Yalnız yöneticiler görür" value={note} onChange={(e) => setNote(e.target.value)}
            inputProps={{ 'aria-label': 'Yeni not' }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }} />
          <Button variant="contained" disableElevation disabled={!note.trim()} onClick={async () => { await onAddNote(note.trim()); setNote(''); }}
            sx={{ alignSelf: 'flex-end', height: 42, px: 2.25, bgcolor: au.primary, borderRadius: '10px', fontWeight: 700, textTransform: 'none' }}>
            Notu ekle
          </Button>
          {notes.slice(0, 3).map((n) => (
            <Box key={n.id} sx={{ borderTop: `1px solid ${au.borderSoft}`, pt: 1.25, fontSize: 13 }}>
              <Typography sx={{ fontWeight: 600, fontSize: 13, whiteSpace: 'pre-wrap' }}>{n.content}</Typography>
              <Typography sx={{ color: au.muted, fontSize: 12.5 }}>{n.createdBy} · {fmtDate(n.createdAt)}</Typography>
            </Box>
          ))}
        </Box>

        <Box component="section" sx={{ ...card, borderColor: au.dangerBorder, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          <Typography component="h2" sx={{ ...h2, color: au.danger }}>Riskli işlemler</Typography>
          <Typography sx={{ fontSize: 13, color: au.muted }}>Her işlem sebep ister ve denetim kaydına yazılır.</Typography>
          <Button variant="outlined" onClick={() => { setReason(''); setRisk('block'); }}
            sx={{ height: 44, color: blocked ? au.primary : au.danger, borderColor: blocked ? au.primaryOutline : au.dangerBorder, borderRadius: '10px', fontWeight: 700, textTransform: 'none' }}>
            {blocked ? 'Engeli kaldır' : 'Hesabı engelle'}
          </Button>
          <Button variant="outlined" onClick={() => { setReason(''); setRisk('delete'); }}
            sx={{ height: 44, color: au.danger, borderColor: au.dangerBorder, borderRadius: '10px', fontWeight: 700, textTransform: 'none' }}>
            Hesabı sil
          </Button>
        </Box>
      </Stack>

      <Dialog open={!!risk} onClose={() => setRisk(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {risk === 'delete' ? `${o.name} hesabı kalıcı olarak silinsin mi?` : blocked ? `${o.name} hesabının engeli kaldırılsın mı?` : `${o.name} engellensin mi?`}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2, color: au.muted }}>
            {risk === 'delete'
              ? 'Bu işlem geri alınamaz. Kullanıcının verileri silinir. Sebep yönetici notlarına ve denetim kaydına yazılır.'
              : blocked
                ? 'Hesap yeniden aktif olur, kullanıcı giriş yapabilir.'
                : 'Kullanıcı giriş yapamaz, açık oturumları kapanır.'}
          </Typography>
          <TextField autoFocus fullWidth multiline minRows={2} label="Sebep (zorunlu)" value={reason} onChange={(e) => setReason(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRisk(null)}>Vazgeç</Button>
          <Button variant="contained" color={risk === 'delete' || !blocked ? 'error' : 'primary'} disabled={busy || reason.trim().length < 5} onClick={confirmRisk}>
            {risk === 'delete' ? 'Kalıcı olarak sil' : blocked ? 'Engeli kaldır' : 'Engelle'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

const EVENT_LABEL: Record<string, string> = {
  LOGIN: 'Giriş yaptı',
  LOGOUT: 'Çıkış yaptı',
  REGISTER: 'Kayıt oldu',
  PASSWORD_RESET: 'Şifresini sıfırladı',
  TOKEN_REFRESH: 'Oturumu yenilendi',
  PROFILE_UPDATE: 'Profilini güncelledi',
  EMAIL_VERIFICATION: 'E-postasını doğruladı',
};
