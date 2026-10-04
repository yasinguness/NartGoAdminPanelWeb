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
  const [member,setMember] = useState<NbMember | null>(null);
  const [validDays,setValidDays] = useState(14);
  const [sectors,setSectors] = useState<Sector[]>([]);
  const [review,setReview] = useState<IntakeRow | null>(null);
  const [codes,setCodes] = useState<string[]>([]);
  const [confirmed,setConfirmed] = useState(false);
  const [note,setNote] = useState('');
  const [contacts,setContacts] = useState<IntakeContact[]>([]);
  // WhatsApp dugmesi dogrudan uyenin sohbetine gitsin diye numarayi da tasiyoruz.
  // Liste ucu numara dondurmuyor; baglanti uretilirken ayrica cekiliyor.
  const [link,setLink] = useState<(IntakeLink & { result: boolean; memberLabel: string; phone: string | null }) | null>(null);
  /**
   * Uyenin kayitli numarasi. Alinamazsa null doner ve baglanti yine gosterilir:
   * admin mesaji kopyalayip kendi kanalindan iletebilir. Numara ugruna
   * baglanti diyalogunu hic acmamak kotu bir takas olurdu.
   */
  const memberPhone = async (memberId: string): Promise<string | null> => {
    try { return (await nbAdminService.getMember(memberId))?.phoneNumber?.toString().trim() || null; }
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
      nbAdminService.listMembers({q:query,page:0,size:50}).then(p => {
        if (active) setMembers((p?.content || []).filter(m => m.status === 'ACTIVE' || m.status === 'TRIAL'));
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
          renderInput={params=><TextField {...params} label="Aktif / deneme üyesi ara" size="small" />} />
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
    <Stack spacing={2}>{rows.length===0 && <Alert severity="info">Bu filtrede kayıt yok.</Alert>}{rows.map(row=><Paper variant="outlined" key={row.id} sx={{p:2}}>
      <Stack direction={{xs:'column',sm:'row'}} justifyContent="space-between" spacing={2}>
        <Box><Typography fontWeight={600}>{row.memberLabel || row.memberId}</Typography>
          <Typography variant="body2" color="text.secondary">Oluşturma: {date(row.createdAt)} · Yanıt: {date(row.submittedAt)}</Typography>
          <Typography variant="caption">Sorumlu yönetici: {row.assignedTo}</Typography>
          <Stack direction="row" spacing={1} sx={{mt:1}} flexWrap="wrap"><Chip size="small" label={row.revoked ? 'Bağlantılar iptal edildi' : labels[row.status]} />{!row.revoked && new Date(row.expiresAt)<new Date() && <Chip size="small" label="Form süresi dolmuş" />}{row.contactQuoteIds.length>0 && <Chip color={row.contactPending ? "warning" : "default"} size="small" label={row.contactPending ? `${row.contactQuoteIds.length} görüşme isteği` : "Görüşmeler takip edildi"} />}</Stack>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap"><Button disabled={busy} onClick={()=>inspect(row)}>İncele</Button>
          {row.status==='APPROVED' && !row.revoked && <Button disabled={busy} onClick={()=>{if(window.confirm('Yeni sonuç bağlantısı önceki sonuç bağlantısını geçersiz kılar. Devam edilsin mi?')) void run(async()=>setLink({...await nbIntakeService.resultLink(row.id),result:true,memberLabel:row.memberLabel || row.memberId,phone:await memberPhone(row.memberId)}));}}>Sonuç bağlantısı</Button>}
          {!row.revoked && <Button color="error" disabled={busy} onClick={()=>{if(window.confirm('Form ve sonuç bağlantıları iptal edilecek. Yayımlanan ilanlar açık kalır. Devam edilsin mi?')) void run(async()=>{await nbIntakeService.revoke(row.id);});}}>Bağlantıları iptal et</Button>}
        </Stack>
      </Stack>
    </Paper>)}</Stack>
    <Stack direction="row" spacing={2} sx={{mt:2}}><Button disabled={busy || page===0} onClick={()=>setPage(p=>p-1)}>Önceki</Button><Typography sx={{py:1}}>{page+1} / {Math.max(1,totalPages)}</Typography><Button disabled={busy || page+1>=totalPages} onClick={()=>setPage(p=>p+1)}>Sonraki</Button></Stack>
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
