import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, Chip, Divider, Paper, Stack, TextField, Typography } from '@mui/material';
import { useSnackbar } from 'notistack';
import { useRole } from '../../hooks/useRole';
import SendToAdminDialog, { AdminRequestBadge } from '../../components/heritage/SendToAdminDialog';
import { useAdminRequestTargets } from '../../hooks/useAdminRequestTargets';
import type { AdminRequestTarget } from '../../services/heritageEditorService';
import { errorText } from '../../services/heritageReviewService';
import { heritageVillageService, type ContributionItem, type VillageContributions } from '../../services/heritageVillageService';

const TASK_OPTION: Record<string, string> = { circassian_name: 'Çerkesçe adı', old_name: 'Eski adı', unknown: 'Bilinmiyor' };
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');

/**
 * Köy sayfası › Kullanıcı katkıları. Önerilen bilgi (ad, sülale, tarihçe, köy bilgisi, düzeltme, kaldırma) onaylanınca
 * köy sayfasına girer; topluluğun doğrudan eklediği ad/sülaleler burada kabul edilir ya da kaldırılır.
 * Önerilerde öneren admin'e görünür (konum masasındaki gibi); topluluk kayıtlarında ekleyen hiçbir yerde gösterilmez.
 */
export default function ContributionsTab({ villageId, data, onChange }: { villageId: string; data: VillageContributions; onChange: () => void }) {
  const { enqueueSnackbar } = useSnackbar();
  const [busy, setBusy] = useState<string | null>(null);
  // Teyitli kaydı kaldıran öneri: editör onaylayamaz, yöneticiye gönderir.
  const { isAdmin } = useRole();
  const requests = useAdminRequestTargets(!isAdmin && data.pending.some((c) => c.removesVerified));
  const [sending, setSending] = useState<ContributionItem | null>(null);

  const act = async (key: string, fn: () => Promise<void>, done: string) => {
    setBusy(key);
    try { await fn(); enqueueSnackbar(done, { variant: 'success' }); onChange(); }
    catch (e) { enqueueSnackbar(errorText(e), { variant: 'error' }); }
    finally { setBusy(null); }
  };

  const nothing = data.pending.length === 0 && data.community.length === 0 && data.tasks.length === 0 && data.locationPending.length === 0;
  const answers = data.locationAnswers ?? {};
  const answerTotal = Object.values(answers).reduce((a, b) => a + b, 0);

  return (
    <Stack spacing={3}>
      {nothing && <Alert severity="success">Bu köy için onay bekleyen kullanıcı katkısı yok.</Alert>}

      {data.pending.length > 0 && (
        <Section title="Onay bekleyen öneriler" hint="Onaylanan bilgi köy sayfasına girer; reddedilen yayına girmez. Not yazmak isteğe bağlı.">
          {data.pending.map((c) => (
            <PendingCard key={c.id} item={c} busy={busy === c.id} onTrustChanged={onChange}
              adminRequest={requests.get('contribution', c.id)} onSendToAdmin={() => setSending(c)}
              onDecide={(approve, note, values) => act(c.id, () => heritageVillageService.reviewContribution(villageId, c.id, approve, note, values), approve ? 'Onaylandı, köy sayfasına eklendi.' : 'Reddedildi.')} />
          ))}
          {sending && (
            <SendToAdminDialog open kind="contribution" target={sending.id} subject={sending.title}
              onClose={() => setSending(null)}
              onSent={(already) => { setSending(null); void requests.reload(); enqueueSnackbar(already ? 'Bu öneri zaten yöneticide bekliyor.' : 'Yöneticiye gönderildi.', { variant: 'success' }); }} />
          )}
        </Section>
      )}

      {data.community.length > 0 && (
        <Section title="Topluluğun eklediği, teyit bekleyen kayıtlar"
          hint={`Bunlar köy sayfasında "teyit bekliyor" ya da "tartışmalı" etiketiyle zaten görünüyor. Köyden ${data.trustNeeded} kişi teyit edince kendiliğinden teyitli olur; burada doğrudan kabul ya da kaldırabilirsin.`}>
          {data.community.map((c) => (
            <Paper key={c.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip size="small" label={c.type === 'name' ? 'Ad' : 'Sülale'} />
                    <Typography fontWeight={700}>{c.label}</Typography>
                    {c.detail && <Typography variant="caption" color="text.secondary">{c.type === 'name' ? (c.detail === 'cyrillic' ? 'Kiril' : 'Latin') : c.detail}</Typography>}
                    <Chip size="small" color={c.trust === 'disputed' ? 'error' : 'warning'} variant="outlined" label={c.trust === 'disputed' ? 'Tartışmalı' : `Teyit bekliyor · ${c.confirms}/${data.trustNeeded}`} />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">Eklenme: {fmt(c.added_at)}</Typography>
                  {c.disputes.map((d, i) => <Typography key={i} variant="body2" color="error.main">İtiraz: {d.reason || 'gerekçe yazılmamış'}</Typography>)}
                </Box>
                <Stack direction="row" spacing={1}>
                  <Button size="small" variant="contained" color={c.disputes.length ? 'warning' : 'primary'} disabled={busy === c.id}
                    onClick={() => {
                      // İtiraz edilmiş kayıt: kabul itirazı kapatır, bu yüzden açıkça sorulur.
                      if (c.disputes.length && !window.confirm(`"${c.label}" için ${c.disputes.length} itiraz var. İtiraza rağmen kabul edilsin mi? İtiraz kapanır ve kayıt teyitli olur.`)) return;
                      void act(c.id, () => heritageVillageService.resolveCommunity(villageId, c.type, c.id, 'keep'), 'Kabul edildi.');
                    }}>{c.disputes.length ? 'İtiraza rağmen kabul et' : 'Doğru, kabul et'}</Button>
                  <Button size="small" color="error" disabled={busy === c.id}
                    onClick={() => { if (window.confirm(`"${c.label}" bu köyden kaldırılsın mı?`)) void act(c.id, () => heritageVillageService.resolveCommunity(villageId, c.type, c.id, 'remove'), 'Kaldırıldı.'); }}>Kaldır</Button>
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Section>
      )}

      {data.tasks.length > 0 && (
        <Section title="Köy soruları" hint="Köylülere sorulan sorular ve oy dağılımı. Bir cevap en az 3 oy alınca onaylanabilir.">
          {data.tasks.map((t) => (
            <Paper key={t.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography fontWeight={600}>{t.question}</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                {t.options.map((o) => {
                  const n = t.votes[o] ?? 0;
                  return (
                    <Button key={o} size="small" variant={n >= 3 ? 'contained' : 'outlined'} disabled={n < 3 || busy === t.id}
                      onClick={() => act(t.id, () => heritageVillageService.decideTask(villageId, t.id, o), 'Soru karara bağlandı.')}>
                      {TASK_OPTION[o] ?? o} · {n} oy
                    </Button>
                  );
                })}
              </Stack>
            </Paper>
          ))}
        </Section>
      )}

      {(data.locationPending.length > 0 || answerTotal > 0) && (
        <Section title="Konum" hint="Konum önerileri haritayla birlikte Köy Konumları masasında incelenir.">
          {answerTotal > 0 && (
            <Typography variant="body2">
              Köylülerin konum cevabı: {answers.yes ?? 0} "doğru", {answers.no ?? 0} "yanlış", {answers.unknown ?? 0} "bilmiyorum".
            </Typography>
          )}
          {data.locationPending.map((c) => (
            <Paper key={c.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box sx={{ flex: 1 }}><Typography fontWeight={600}>{c.title}</Typography><Lines item={c} /></Box>
                <Button size="small" component={RouterLink} to="/heritage/locations">Konum masasında aç</Button>
              </Stack>
            </Paper>
          ))}
        </Section>
      )}

      {data.recent.length > 0 && (
        <Section title="Son kararlar">
          {data.recent.map((r) => (
            <Typography key={r.id} variant="body2" color="text.secondary">
              {fmt(r.reviewed_at)} · {r.status === 'approved' ? 'Onaylandı' : 'Reddedildi'} · {r.contributor ?? 'Kullanıcı'}{r.reviewer ? ` · karar: ${r.reviewer}` : ''}{r.review_note ? ` · "${r.review_note}"` : ''}
            </Typography>
          ))}
        </Section>
      )}
    </Stack>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
      {hint && <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{hint}</Typography>}
      <Stack spacing={1.5}>{children}</Stack>
      <Divider sx={{ mt: 3 }} />
    </Box>
  );
}

function Lines({ item }: { item: ContributionItem }) {
  return (
    <Box component="dl" sx={{ m: 0, mt: 1, display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: 2, rowGap: 0.5 }}>
      {item.lines.map((l, i) => (
        <Box key={i} sx={{ display: 'contents' }}>
          <Typography component="dt" variant="body2" color="text.secondary">{l.label}</Typography>
          <Typography component="dd" variant="body2" sx={{ m: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{l.value}</Typography>
        </Box>
      ))}
    </Box>
  );
}

function PendingCard({ item, busy, onDecide, onTrustChanged, adminRequest, onSendToAdmin }: { item: ContributionItem; busy: boolean; onDecide: (approve: boolean, note?: string, values?: Record<string, string>) => void; onTrustChanged?: () => void; adminRequest?: AdminRequestTarget; onSendToAdmin?: () => void }) {
  // Güvenilir katkıcı ayarı yöneticide (sunucu: HeritageRoles.ADMIN).
  const { isAdmin } = useRole();
  const [note, setNote] = useState('');
  const [rejecting, setRejecting] = useState(false);
  // Düzeltme bildiriminde doğru değer yoksa onaylayan yazar (ad ya da tarihçe metni); bugünkü değerle başlar.
  const field = item.type === 'correction' ? (item.targetType === 'name' ? 'name' : item.targetType === 'history' ? 'narrative' : null) : null;
  const [value, setValue] = useState(field ? item.current?.[field] ?? '' : '');
  const familyFix = item.type === 'correction' && item.targetType === 'family' && item.needsValue;
  const unchanged = Boolean(field && item.needsValue && value.trim() === (item.current?.[field] ?? '').trim());
  // Bu öneriye ait oylar (köy konum teyidi değil). "Yanlış" oyu varsa onay, itiraza rağmen verilen bir karardır: not istenir.
  const votes = (item.votesYes ?? 0) + (item.votesNo ?? 0);
  const contested = (item.votesNo ?? 0) > 0;
  const [approving, setApproving] = useState(false);
  // Teyitli kaydı kaldırma: onay yalnız yöneticide (sunucu da 403 döner).
  const adminOnly = !isAdmin && Boolean(item.removesVerified);
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography fontWeight={700} sx={{ flex: 1 }}>{item.title}</Typography>
        <Typography variant="caption" color="text.secondary">{fmt(item.createdAt)}</Typography>
      </Stack>
      {item.inVoting && (
        <Alert severity="info" sx={{ my: 1 }}>Köylü oyunda: {item.votesYes ?? 0} doğru · {item.votesNo ?? 0} yanlış. Köyün üyeleri karar verir; anlaşmazlık ya da 14 gün kararsızlıkta size düşer. İsterseniz şimdi karar verebilirsiniz.</Alert>
      )}
      {!item.inVoting && item.escalationReason && <Alert severity="warning" sx={{ my: 1 }}>Size düştü: {item.escalationReason}</Alert>}
      {!item.inVoting && votes > 0 && (
        <Typography variant="body2" sx={{ my: 0.5 }}>
          Bu öneriye köylü oyu: <b>{item.votesYes ?? 0} doğru</b> · <b style={{ color: contested ? '#b3412a' : undefined }}>{item.votesNo ?? 0} yanlış</b>
        </Typography>
      )}
      <Typography variant="caption" color="text.secondary">
        {item.contributorTrusted && <Chip size="small" color="success" variant="outlined" label="Güvenilir katkıcı" sx={{ mr: 1 }} />}
        {item.contributor ?? 'Kullanıcı'}{item.contributorApproved ? ` · daha önce ${item.contributorApproved} katkısı onaylandı` : ' · ilk katkısı'}{item.source === 'app' ? ' · uygulamadan' : item.source === 'web' ? ' · webden' : ''}
      </Typography>
      <Lines item={item} />
      {adminOnly && (
        <Alert severity="warning" sx={{ mt: 1.5 }} action={adminRequest?.status === 'open' ? <AdminRequestBadge value={adminRequest} /> : undefined}>
          Kaldırılmak istenen kayıt köylülerce teyit edilmiş. Bu öneriyi yalnız yönetici onaylayabilir; kaldırılması gerektiğini düşünüyorsanız yöneticiye gönderin, değilse reddedin.
          {adminRequest?.status === 'declined' && <Box sx={{ mt: 0.5 }}><AdminRequestBadge value={adminRequest} /></Box>}
        </Alert>
      )}
      {field && item.needsValue && !rejecting && (
        <TextField size="small" fullWidth sx={{ mt: 1.5 }} multiline={field === 'narrative'} minRows={field === 'narrative' ? 3 : undefined}
          label={field === 'name' ? 'Doğru ad' : 'Doğru tarihçe metni'} value={value} onChange={(e) => setValue(e.target.value)}
          helperText="Bildirimde doğru değer yazılmamış. Gerekçeye göre doğru değeri yazıp onaylayın; onaylanınca köy sayfasındaki kayıt bununla değişir." />
      )}
      {familyFix && !rejecting && (
        <Alert severity="info" sx={{ mt: 1.5 }}>Bildirimde doğru sülale seçilmemiş. Sülaleyi Sülale Atlası'ndan düzeltip bu bildirimi reddedin.</Alert>
      )}
      {rejecting && (
        <TextField size="small" fullWidth sx={{ mt: 1.5 }} label="Ret nedeni (isteğe bağlı)" value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="Örnek: kaynak yok, başka köyle karıştırılmış" />
      )}
      {approving && (
        <TextField size="small" fullWidth required autoFocus sx={{ mt: 1.5 }} label="Neden onaylıyorsunuz? (zorunlu)" value={note} onChange={(e) => setNote(e.target.value)}
          helperText={`Köylülerden ${item.votesNo} kişi "yanlış" dedi. Not kayıt geçmişinde görünür.`}
          placeholder="Örnek: köyden iki kişiyle telefonda konuştum; doğru ad bu." />
      )}
      <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
        {approving ? (
          <>
            <Button size="small" variant="contained" color="warning" disabled={busy || !note.trim()}
              onClick={() => onDecide(true, note.trim(), field && item.needsValue ? { [field]: value.trim() } : undefined)}>İtiraza rağmen onayla</Button>
            <Button size="small" disabled={busy} onClick={() => { setApproving(false); setNote(''); }}>Vazgeç</Button>
          </>
        ) : !rejecting && adminOnly ? (
          <>
            <Button size="small" variant="contained" disabled={busy || adminRequest?.status === 'open'} onClick={onSendToAdmin}>Yöneticiye gönder</Button>
            <Button size="small" color="error" disabled={busy} onClick={() => setRejecting(true)}>Reddet</Button>
          </>
        ) : !rejecting ? (
          <>
            <Button size="small" variant="contained" color={contested ? 'warning' : 'primary'} disabled={busy || familyFix || unchanged || (field !== null && item.needsValue && !value.trim())}
              title={unchanged ? 'Önce doğru değeri yazın.' : undefined}
              onClick={() => { if (contested) { setApproving(true); return; } onDecide(true, undefined, field && item.needsValue ? { [field]: value.trim() } : undefined); }}>{contested ? 'İtiraza rağmen onayla' : 'Onayla'}</Button>
            <Button size="small" color="error" disabled={busy} onClick={() => setRejecting(true)}>Reddet</Button>
            {item.contributorId && isAdmin && (
              <Button size="small" disabled={busy} sx={{ ml: 'auto' }}
                onClick={() => { const next = item.contributorTrusted ? 'untrusted' : 'trusted'; void heritageVillageService.setContributorTrust(item.contributorId!, next).then(() => onTrustChanged?.()); }}>
                {item.contributorTrusted ? 'Güvenilir katkıcılıktan çıkar' : 'Güvenilir katkıcı yap'}
              </Button>
            )}
          </>
        ) : (
          <>
            <Button size="small" variant="contained" color="error" disabled={busy} onClick={() => onDecide(false, note.trim() || undefined)}>Reddi kaydet</Button>
            <Button size="small" disabled={busy} onClick={() => { setRejecting(false); setNote(''); }}>Vazgeç</Button>
          </>
        )}
      </Stack>
    </Paper>
  );
}
