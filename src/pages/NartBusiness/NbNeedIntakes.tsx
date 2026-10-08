import { useCallback, useEffect, useState } from 'react';
import { Alert, Autocomplete, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControlLabel, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { nbAdminService } from '../../services/nartbusiness/nbAdminService';
import { nbIntakeService, type IntakeRow, type IntakeLink, type IntakeContact } from '../../services/nartbusiness/nbIntakeService';
import type { NbMember, Sector } from '../../services/nartbusiness/nbTypes';
import { nbErrorMessage } from '../../services/nartbusiness/nbErrorMessage';
import { nbFormatPhone, nbWhatsAppLink } from '../../services/nartbusiness/nbPhone';
const labels: Record<string,string> = { INVITED: 'Yanıt bekleniyor', PENDING: 'Yayın onayı bekliyor',
  ACKNOWLEDGED: 'Şimdilik ihtiyaç yok', APPROVED: 'Yayımlandı', REJECTED: 'Yayımlanmadı' };
const times: Record<string,string> = { WITHIN_7_DAYS: '7 gün içinde', WITHIN_30_DAYS: '30 gün içinde', WITHIN_60_DAYS: '60 gün içinde', FLEXIBLE: 'Esnek' };
const date = (v?: string) => v ? new Date(v).toLocaleString('tr-TR') : '—';
/** Kisa tarih: "4 Eki 18:32". Liste taranirken tam zaman damgasi gurultu yapiyor. */
const shortDate = (v?: string) => v
  ? new Date(v).toLocaleString('tr-TR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})
  : '—';
/** "3 gun once" — admin "ne zaman yanit verdi" sorusunu takvim hesabi yapmadan gormeli. */
const rel = (v?: string) => {
  if (!v) return '';
  const diff = Date.now() - new Date(v).getTime();
  const d = Math.floor(diff/86400000), h = Math.floor(diff/3600000), m = Math.floor(diff/60000);
  if (d > 0) return `${d} gün önce`;
  if (h > 0) return `${h} saat önce`;
  return m > 0 ? `${m} dk önce` : 'az önce';
};
/** Durumun rengi: bekleyen is sari, biten yesil, olumsuz gri. */
const statusColor: Record<string,'default'|'warning'|'success'|'info'> = {
  INVITED: 'info', PENDING: 'warning', ACKNOWLEDGED: 'default',
  APPROVED: 'success', REJECTED: 'default' };
export default function NbNeedIntakes() {
  const [rows,setRows] = useState<IntakeRow[]>([]);
  const [status,setStatus] = useState('PENDING');
  const [page,setPage] = useState(0);
  const [contactsOnly,setContactsOnly] = useState(false);
  const [totalPages,setTotalPages] = useState(0);
  const [total,setTotal] = useState(0);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const [busy,setBusy] = useState(false);
  const [query,setQuery] = useState('');
  const [members,setMembers] = useState<NbMember[]>([]);
  const [memberTotal,setMemberTotal] = useState(0);
  const [member,setMember] = useState<NbMember | null>(null);
  const [validDays,setValidDays] = useState(14);
  const [sectors,setSectors] = useState<Sector[]>([]);
  const [review,setReview] = useState<IntakeRow | null>(null);
  const [codes,setCodes] = useState<string[]>([]);
  const [confirmed,setConfirmed] = useState(false);
  const [note,setNote] = useState('');
  const [contacts,setContacts] = useState<IntakeContact[]>([]);
  // WhatsApp dugmesi dogrudan uyenin sohbetine gitsin diye numarayi da tasiyoruz.
  // Liste ucu numara dondurmuyor; baglanti uretilirken uc kaynaktan cozuluyor
  // (bkz. nbAdminService.resolveMemberPhone).
  const [link,setLink] = useState<(IntakeLink & { result: boolean; memberLabel: string; phone: string | null }) | null>(null);
  /**
   * Uyenin kayitli numarasi. Alinamazsa null doner ve baglanti yine gosterilir:
   * admin mesaji kopyalayip kendi kanalindan iletebilir. Numara ugruna
   * baglanti diyalogunu hic acmamak kotu bir takas olurdu.
   */
  const memberPhone = async (memberId: string): Promise<string | null> => {
    try { return await nbAdminService.resolveMemberPhone(memberId); }
    catch { return null; }
  };
  const load = useCallback(async () => {
    try { const p = await nbIntakeService.list(status,page,contactsOnly); setRows(p.content); setTotalPages(p.totalPages); setTotal(p.totalElements); }
    catch(e) { setError(nbErrorMessage(e)); }
  },[status,page,contactsOnly]);
  useEffect(() => { void load(); },[load]);
  useEffect(() => { nbAdminService.listSectors().then(setSectors).catch(e => setError(nbErrorMessage(e))); },[]);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      // size 50 iken listede 69 uygun uyenin yalnizca bir kismi gorunuyordu:
      // sunucu ilk 50 kaydi doner, durum filtresi ONDAN SONRA uygulanir, yani
      // uygun uyeler sayfa disinda kalip "listede yok" olur (YMM Kudret, Nart
      // Reklam, Woshe boyle kayboldu). Arama sunucuda calistigi icin buyuk
      // sayfa yalnizca "bos arama" durumunu kurtarmak icin; kadro buyurse
      // toplam sayi asagida gosteriliyor, kirpilma gorunur olur.
      nbAdminService.listMembers({q:query,page:0,size:200}).then(p => {
        // Backend daveti yalnizca ACTIVE/TRIAL'a veriyor (NeedIntakeService.eligible);
        // digerlerini listelemek secilince hata veren bir secenek yaratirdi.
        if (active) {
          setMembers((p?.content || []).filter(m => m.status === 'ACTIVE' || m.status === 'TRIAL'));
          setMemberTotal(p?.totalElements ?? 0);
        }
      }).catch(e => { if(active) setError(nbErrorMessage(e)); });
    },300);
    return () => { active=false; clearTimeout(timer); };
  },[query]);
  async function run(work: () => Promise<void>) {
    setBusy(true); setError(''); setNotice('');
    try { await work(); await load(); } catch(e) { setError(nbErrorMessage(e)); }
    finally { setBusy(false); }
  }
  async function inspect(row: IntakeRow) {
    setReview(row); setCodes((row.items || []).map(() => '')); setConfirmed(false); setNote(''); setContacts([]);
    if (row.contactQuoteIds.length) {
      try { setContacts(await nbIntakeService.contacts(row.id)); } catch(e) { setError(nbErrorMessage(e)); }
    }
  }
  // Mesaj gövdesi ile bağlantı ayrı tutuluyor: WhatsApp ve kopyala satır içi
  // URL ister, e-posta ise gövdeyi metin, bağlantıyı düğme olarak basar. Tek
  // kaynak olduğu için iki kanaldaki metin zamanla ayrışmaz.
  const msg = link ? (link.result
    ? 'NartBusiness talebinizin sonuçlarını ve gelen teklifleri bu kişisel bağlantıdan takip edebilirsiniz. Uygulama indirmeniz gerekmez. Bağlantınızı paylaşmayın.'
    : 'Önümüzdeki 2 ay içinde alım, satım veya tedarik planınız var mı? İhtiyacınızı kısaca yazın; sizinle teyit edip doğrudan ilgili doğrulanmış işletmelere iletelim. (Uygulama indirme şartı yoktur.)') : '';
  const text = link ? `${msg} ${link.url}` : '';
  // Dogrudan uyenin sohbetine giden baglanti. null donmesinin iki sebebi olabilir
  // ve admin'e hangisi oldugunu soylemek gerekiyor: numara hic kayitli degil mi,
  // yoksa kayitli ama E.164'e cevrilemiyor mu. Ikisinde yapilacak sey farkli.
  const wa = link ? nbWhatsAppLink(link.phone, text) : null;
  return <Box sx={{p:{xs:2,md:3},maxWidth:1200,mx:'auto'}}>
    <Typography variant="h5" fontWeight={600}>60 Günlük İhtiyaç Formları</Typography>
    <Typography color="text.secondary" sx={{mt:1}}>Kişisel bağlantı oluşturun, yanıtı üyeyle teyit edin ve mevcut talep/arz akışında yayımlayın.</Typography>
    {error && <Alert severity="error" sx={{mt:2}}>{error}</Alert>}
    {notice && <Alert severity="success" sx={{mt:2}}>{notice}</Alert>}
    <Paper variant="outlined" sx={{p:2,mt:3}}>
      <Stack direction={{xs:'column',sm:'row'}} spacing={2} alignItems="flex-start">
        <Autocomplete sx={{flex:1,minWidth:240}} options={members} value={member} filterOptions={x=>x}
          isOptionEqualToValue={(a,b)=>a.memberId===b.memberId} onChange={(_,value)=>setMember(value)}
          onInputChange={(_,value)=>setQuery(value)} getOptionLabel={m=>`${m.companyName || m.displayName || m.memberId} · ${m.status}`}
          renderInput={params=><TextField {...params} label={`Aktif / deneme üyesi ara (${members.length} yüklü)`} size="small"
            helperText={memberTotal>200 ? `${memberTotal} üyeden ilk 200'ü yüklendi — aramayı daraltın` : ' '} />} />
        <TextField label="Geçerlilik (gün)" type="number" size="small" value={validDays} inputProps={{min:1,max:60}} onChange={e=>setValidDays(Number(e.target.value))} sx={{width:150}} />
        <Button variant="contained" disabled={busy || !member || validDays<1 || validDays>60 || !Number.isInteger(validDays)} onClick={()=>run(async()=>{
          const value=await nbIntakeService.invite(member!.memberId,validDays); setLink({...value,result:false,memberLabel:member!.companyName || member!.displayName || member!.memberId,phone:await memberPhone(member!.memberId)});
        })}>Bağlantı oluştur</Button>
      </Stack>
      <Typography variant="caption" display="block" sx={{mt:1}}>Mesaj otomatik gönderilmez. Bağlantı yalnız bu ekranda gösterilir; kaybolursa eski bağlantıyı iptal edip yenisini oluşturun.</Typography>
    </Paper>
    <Stack direction="row" spacing={2} sx={{my:3}} alignItems="center">
      <TextField select size="small" label="Durum" value={status} onChange={e=>{setStatus(e.target.value);setPage(0);}} sx={{minWidth:230}}><MenuItem value="">Tümü</MenuItem>{Object.entries(labels).map(([key,label])=><MenuItem key={key} value={key}>{label}</MenuItem>)}</TextField>
      <FormControlLabel control={<Checkbox checked={contactsOnly} onChange={e=>{setContactsOnly(e.target.checked);setStatus(e.target.checked ? "APPROVED" : "PENDING");setPage(0);}} />} label="Bekleyen görüşmeler" /><Button disabled={busy} onClick={()=>run(async()=>{})}>Yenile</Button><Typography variant="body2">{total} kayıt</Typography>
    </Stack>
    <Stack spacing={1.5}>{rows.length===0 && <Paper variant="outlined" sx={{p:4,textAlign:'center'}}>
      <Typography color="text.secondary">Bu filtrede kayıt yok.</Typography>
      <Typography variant="caption" color="text.disabled">Yukarıdan bir üye seçip bağlantı oluşturabilirsiniz.</Typography>
    </Paper>}{rows.map(row=>{
      const expired = !row.revoked && new Date(row.expiresAt) < new Date();
      // Dikkat isteyen satir kenarindan belli olsun: admin listeyi yukaridan
      // asagi tariyor, rengi okumak metni okumaktan hizli.
      const accent = row.revoked ? 'divider'
        : row.contactPending ? 'warning.main'
        : row.status==='PENDING' ? 'warning.main'
        : row.status==='APPROVED' ? 'success.main' : 'divider';
      return <Paper variant="outlined" key={row.id}
        sx={{p:2, borderLeft:3, borderLeftColor:accent, transition:'background-color .15s',
             '&:hover':{bgcolor:'action.hover'}}}>
      <Stack direction={{xs:'column',sm:'row'}} justifyContent="space-between" spacing={2}>
        <Box sx={{minWidth:0}}>
          <Typography fontWeight={600} sx={{overflowWrap:'anywhere'}}>{row.memberLabel || row.memberId}</Typography>
          <Stack direction="row" spacing={1} sx={{mt:0.75}} flexWrap="wrap" useFlexGap>
            <Chip size="small" color={row.revoked ? 'default' : (statusColor[row.status] || 'default')}
              variant={row.revoked ? 'outlined' : 'filled'}
              label={row.revoked ? 'Bağlantılar iptal edildi' : labels[row.status]} />
            {expired && <Chip size="small" variant="outlined" label="Form süresi dolmuş" />}
            {row.contactQuoteIds.length>0 && <Chip color={row.contactPending ? 'warning' : 'success'}
              variant={row.contactPending ? 'filled' : 'outlined'} size="small"
              label={row.contactPending ? `${row.contactQuoteIds.length} görüşme isteği` : 'Görüşmeler takip edildi'} />}
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{mt:1}}>
            Oluşturma {shortDate(row.createdAt)}
            {row.submittedAt
              ? <> · Yanıt {shortDate(row.submittedAt)} <Box component="span" sx={{color:'text.disabled'}}>({rel(row.submittedAt)})</Box></>
              : <Box component="span" sx={{color:'text.disabled'}}> · yanıt bekleniyor</Box>}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap"><Button disabled={busy} onClick={()=>inspect(row)}>İncele</Button>
          {row.status==='APPROVED' && !row.revoked && <Button disabled={busy} onClick={()=>{if(window.confirm('Yeni sonuç bağlantısı önceki sonuç bağlantısını geçersiz kılar. Devam edilsin mi?')) void run(async()=>setLink({...await nbIntakeService.resultLink(row.id),result:true,memberLabel:row.memberLabel || row.memberId,phone:await memberPhone(row.memberId)}));}}>Sonuç bağlantısı</Button>}
          {!row.revoked && <Button color="error" disabled={busy} onClick={()=>{if(window.confirm('Form ve sonuç bağlantıları iptal edilecek. Yayımlanan ilanlar açık kalır. Devam edilsin mi?')) void run(async()=>{await nbIntakeService.revoke(row.id);});}}>Bağlantıları iptal et</Button>}
        </Stack>
      </Stack>
    </Paper>;})}</Stack>
    <Stack direction="row" spacing={2} sx={{mt:3}} alignItems="center" justifyContent="center"><Button disabled={busy || page===0} onClick={()=>setPage(p=>p-1)}>Önceki</Button><Typography sx={{py:1}}>{page+1} / {Math.max(1,totalPages)}</Typography><Button disabled={busy || page+1>=totalPages} onClick={()=>setPage(p=>p+1)}>Sonraki</Button></Stack>
    <Dialog open={!!review} onClose={()=>{if(!busy)setReview(null);}} fullWidth maxWidth="sm"><DialogTitle>{review?.memberLabel || 'Form yanıtı'}</DialogTitle><DialogContent>
      <Typography variant="body2" sx={{mb:2}}>Kişisel bağlantı iletilebilir. Yayınlamadan önce yanıtı üyenin kayıtlı iletişim kanalından teyit edin.</Typography>
      {review?.items?.map((item,index)=><Box key={item.type} sx={{py:2,borderBottom:1,borderColor:'divider'}}>
        <Typography variant="caption">{item.type==='REQUEST'?'Alım talebi':'Arz ilanı'} · {times[item.timing]}</Typography>
        <Typography fontWeight={600}>{item.title}</Typography><Typography sx={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{item.description}</Typography>
        <Typography variant="body2">{item.city || 'Bölge belirtilmedi'}{item.budget!=null ? ` · Bütçe: ${item.budget} ${item.currency}` : ''}</Typography>
        {item.targetCustomer && <Typography variant="body2">Hedef müşteri: {item.targetCustomer}</Typography>}
        {review.status==='PENDING' && !review.revoked && <TextField select fullWidth size="small" label="İlan sektörü" sx={{mt:2}} value={codes[index] || ''} onChange={e=>setCodes(current=>current.map((v,i)=>i===index?e.target.value:v))}>{sectors.filter(s=>s.active && !s.parentCode).map(s=><MenuItem key={s.code} value={s.code}>{s.nameTr}</MenuItem>)}</TextField>}
      </Box>)}
      {review?.status==='PENDING' && !review.revoked && <><FormControlLabel sx={{mt:2}} control={<Checkbox checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} />} label="Yanıtı üyenin kayıtlı iletişim kanalından teyit ettim; yayın için uygun." /><TextField fullWidth multiline minRows={2} label="Yayımlamama gerekçesi" inputProps={{maxLength:1000}} value={note} onChange={e=>setNote(e.target.value)} sx={{mt:2}} /></>}
      {review?.reviewNote && <Alert severity="info" sx={{mt:2}}>{review.reviewNote}</Alert>}
      {review?.listingIds.map(id=><Typography key={id} sx={{mt:1}}><a href={`/nartbusiness/listings?q=${encodeURIComponent(review.items?.[review.listingIds.indexOf(id)]?.title || '')}`}>Yayımlanan ilan: {id}</a></Typography>)}
      {contacts.length>0 && <Box sx={{mt:3}}><Typography fontWeight={600}>Üyenin görüşmek istediği firmalar</Typography>{contacts.map(c=><Box key={c.id} sx={{py:1}}><Typography>{c.supplierCompanyName || c.supplierDisplayName} · {c.price} {c.currency}</Typography><Typography variant="caption">Üye kimliği: {c.supplierMemberId}</Typography></Box>)}<Typography variant="body2">Üyeler ekranındaki kayıtlı kanallardan tanıştırmayı takip edin. Bu istek teklif kabulü değildir.</Typography>{review?.contactNote && <Alert severity="info" sx={{mt:2}}>{review.contactNote}</Alert>}{review?.contactPending && !review.revoked && <><TextField fullWidth multiline minRows={2} label="Görüşme takip notu" inputProps={{maxLength:1000}} value={note} onChange={e=>setNote(e.target.value)} sx={{mt:2}} /><Button sx={{mt:1}} disabled={busy || !note.trim()} onClick={()=>run(async()=>{await nbIntakeService.completeContacts(review.id,note);setReview(null);setNotice("Görüşme takibi kaydedildi.");})}>Takibi tamamla</Button></>}</Box>}
    </DialogContent><DialogActions><Button disabled={busy} onClick={()=>setReview(null)}>Kapat</Button>{review?.status==='PENDING' && !review.revoked && <><Button color="error" disabled={busy || !note.trim()} onClick={()=>run(async()=>{await nbIntakeService.reject(review.id,note);setReview(null);setNotice('Yanıt yayımlanmadı.');})}>Yayımlama</Button><Button variant="contained" disabled={busy || !confirmed || codes.some(c=>!c) || codes.length===0} onClick={()=>run(async()=>{await nbIntakeService.approve(review.id,codes);setReview(null);setNotice('İlanlar yayımlandı. Sonuç bağlantısını oluşturup yalnız ilgili üyeye iletin.');})}>Onayla ve yayımla</Button></>}</DialogActions></Dialog>
    <Dialog open={!!link} onClose={()=>setLink(null)} fullWidth maxWidth="sm"><DialogTitle>{link?.result?'Özel sonuç bağlantısı':'Kişisel form bağlantısı'}</DialogTitle><DialogContent>
      <Typography fontWeight={600} sx={{mb:0.5}}>Alıcı: {link?.memberLabel}</Typography>
      {link?.phone && <Typography variant="body2" color="text.secondary" sx={{mb:2,fontVariantNumeric:'tabular-nums'}}>{nbFormatPhone(link.phone)}</Typography>}
      <Alert severity="info">Bağlantıyı yalnız ilgili üyeye gönderin. WhatsApp düğmesi mesajı hazırlar; göndermez.</Alert>
      {!wa && <Alert severity="info" sx={{mt:2}}>{link?.phone
        ? `Üyenin kayıtlı numarası (${link.phone}) okunamadı; WhatsApp bağlantısı kurulamıyor. Aynı mesajı "E-posta ile gönder" ile iletebilirsiniz.`
        : 'Üyenin kayıtlı telefon numarası yok. Aynı mesajı "E-posta ile gönder" ile iletebilirsiniz; numarayı üye kaydına eklerseniz WhatsApp düğmesi sohbeti doğrudan açar.'}</Alert>}
      <Typography sx={{my:2}}>Geçerlilik: {date(link?.expiresAt)}</Typography>
      <TextField fullWidth multiline minRows={4} value={text} inputProps={{readOnly:true}} />
      {notice && <Alert severity="success" sx={{mt:2}}>{notice}</Alert>}
      <Stack direction="row" spacing={2} sx={{mt:2}}><Button onClick={async()=>{try{await navigator.clipboard.writeText(text);setNotice('Mesaj kopyalandı.');}catch{setError('Kopyalanamadı; metni seçerek kopyalayın.');}}}>Mesajı kopyala</Button>{wa
      ? <Button component="a" href={wa} target="_blank" rel="noopener noreferrer">WhatsApp'ta aç</Button>
      : <Button disabled>WhatsApp'ta aç</Button>}
      <Button disabled={busy} onClick={()=>{if(link)void run(async()=>{await nbIntakeService.emailLink(link.id,link.url,msg);setNotice('E-posta gönderildi.');});}}>E-posta ile gönder</Button></Stack>
    </DialogContent><DialogActions><Button onClick={()=>setLink(null)}>Kapat</Button></DialogActions></Dialog>
  </Box>;
}
