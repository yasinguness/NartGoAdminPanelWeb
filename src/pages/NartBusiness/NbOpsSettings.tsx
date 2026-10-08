/**
 * NartBusiness operasyon ayarları — eşleştirme, deneme akışı, haftalık özet
 * ve dönüşüm hedefleri. Değerler nb-membership `nb_settings` tablosunda;
 * kaydedilen grup bir dakika içinde (önbellek) her yerde geçerli olur.
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import {
  nbOpsService,
  type NbSettings,
  type NbSettingsGroup,
} from '../../services/nartbusiness/nbOpsService';
import { nbErrorMessage } from '../../services/nartbusiness/nbErrorMessage';
import { NbPageHeader, NbUndoToast, nbCard, type NbUndoState } from '../../components/nartbusiness/ui';
import { nb } from '../../theme/nbBrand';

interface FieldDef {
  key: string;
  label: string;
  help: string;
  type?: 'number' | 'bool' | 'weekday' | 'date';
}

const GROUPS: { group: NbSettingsGroup; title: string; intro: string; fields: FieldDef[] }[] = [
  {
    group: 'tender.matching',
    title: 'İhale eşleştirme',
    intro: 'Eşik ve sınırlar, üyelere yalnızca faaliyet alanıyla gerçekten örtüşen ihalelerin iletilmesini sağlar.',
    fields: [
      { key: 'threshold', label: 'Eşleşme eşiği (1-100)', help: 'Bu puanın altındaki ihaleler eşleşme sayılmaz. Değer yükseldikçe daha az ancak daha isabetli eşleşme oluşur.' },
      { key: 'maxMatchesPerTender', label: 'İhale başına en fazla eşleşme', help: 'Bir ihale, uyum puanı en yüksek bu sayıda üyeyle eşleştirilir.' },
      { key: 'weeklyReferralLimit', label: 'Üye başına haftalık yönlendirme', help: 'Bir üyeye 7 gün içinde iletilebilecek en fazla ihale sayısı.' },
      { key: 'shortlistSize', label: 'Seçki uzunluğu', help: 'Haftalık ihale seçkisinde üye başına önerilen ihale sayısı.' },
    ],
  },
  {
    group: 'trial.playbook',
    title: 'Deneme sonu akışı',
    intro: 'Deneme Takibi ekranındaki görevler bu takvime göre otomatik oluşturulur.',
    fields: [
      { key: 'enabled', label: 'Otomatik görevler etkin', help: 'Devre dışıyken yeni görev oluşturulmaz; mevcut görevler korunur.', type: 'bool' },
      { key: 'resultCardDaysBefore', label: 'Faaliyet özeti (bitişten kaç gün önce)', help: 'Deneme dönemi faaliyet özetinin üyeye gönderileceği gün.' },
      { key: 'callDaysBefore', label: 'Görüşme (bitişten kaç gün önce)', help: 'Deneme sonu değerlendirme görüşmesi. Faaliyet özetinden sonraya planlanmalıdır.' },
      { key: 'introFollowUpDays', label: 'Tanıştırma takibi (gün sonra)', help: 'Tanıştırmada bu süre içinde ilerleme olmazsa takip görevi oluşturulur.' },
      { key: 'offerWindowDays', label: 'Teklif geçerlilik süresi (gün)', help: 'Deneme sona erdikten sonra özel fiyat teklifinin geçerli olduğu süre.' },
      { key: 'followUpStopDaysAfter', label: 'Takibin sona ermesi (bitişten kaç gün sonra)', help: 'Üyeliğe geçmeyen firmaların düzenli takibi bu süreden sonra sonlandırılır.' },
      { key: 'resultCardEmail', label: 'Faaliyet özetini üyeye e-posta ile gönder', help: '', type: 'bool' },
      { key: 'offerEmail', label: 'Deneme sona erdiğinde üyelik seçenekleri e-postası gönder (ertesi gün)', help: '', type: 'bool' },
    ],
  },
  {
    group: 'digest',
    title: 'Haftalık bülten',
    intro: 'Üyelere haftada bir gönderilen kişiselleştirilmiş bültenin içeriği.',
    fields: [
      { key: 'enabled', label: 'Haftalık bülten etkin', help: '', type: 'bool' },
      { key: 'dayOfWeek', label: 'Gönderim günü', help: '', type: 'weekday' },
      { key: 'tenders', label: 'İhale sayısı', help: 'Bültende yer alacak en fazla ihale sayısı.' },
      { key: 'members', label: 'Firma önerisi sayısı', help: 'Bültende önerilecek üye firma sayısı.' },
      { key: 'listings', label: 'Talep sayısı', help: 'Üyenin sektörüyle eşleşen açık talepler.' },
    ],
  },
  {
    group: 'conversion.targets',
    title: 'Dönüşüm hedefleri',
    intro: 'Dönüşüm panosundaki hedefler. Başlangıç tahminleridir; gerçekleşen verilere göre güncellenmelidir.',
    fields: [
      { key: 'valueDeliveredMembers', label: 'Hizmet ulaşan deneme üyesi', help: 'Dört hizmet göstergesinden en az ikisi karşılanan üye sayısı.' },
      { key: 'weeklyActiveMembers', label: 'Haftalık aktif deneme üyesi', help: '' },
      { key: 'referralOpenRatePct', label: 'Yönlendirme açılma oranı (%)', help: '' },
      { key: 'referralFeedbackRatePct', label: 'İhale geri bildirim oranı (%)', help: '' },
      { key: 'meetings', label: 'Görüşmeyle sonuçlanan tanıştırma', help: '' },
      { key: 'paidConversions', label: 'Ücretli üyeliğe geçen', help: '' },
      { key: 'valueGateDate', label: '1. değerlendirme tarihi (hizmet ulaşımı)', help: '', type: 'date' },
      { key: 'paymentGateDate', label: '2. değerlendirme tarihi (ücretli üyelik)', help: '', type: 'date' },
      { key: 'rhythmGateDate', label: '3. değerlendirme tarihi (düzenli kullanım)', help: '', type: 'date' },
    ],
  },
];

const WEEKDAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

type Values = Record<string, number | boolean | string>;

/** Backend doğrulama hatası: alan hataları ErrorResponse.details içinde ({alan: mesaj}). */
function fieldErrorsOf(e: unknown): Record<string, string> {
  return (e as { response?: { data?: { details?: Record<string, string> } } })?.response?.data?.details ?? {};
}

function GroupForm({
  def,
  initial,
  onSaved,
}: {
  def: (typeof GROUPS)[number];
  initial: Values;
  onSaved: (msg: string) => void;
}) {
  const [values, setValues] = useState<Values>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(values) !== JSON.stringify(initial);

  useEffect(() => setValues(initial), [initial]);

  const save = async () => {
    setSaving(true);
    setErrors({});
    setError(null);
    try {
      const changed = Object.fromEntries(Object.entries(values).filter(([k, v]) => initial[k] !== v));
      await nbOpsService.updateSettings(def.group, changed as never);
      onSaved(`${def.title} kaydedildi`);
    } catch (e) {
      setErrors(fieldErrorsOf(e));
      setError(nbErrorMessage(e, 'Kaydedilemedi.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ ...(nbCard as object), p: 2.25, mb: 1.75 }}>
      <Typography sx={{ fontSize: 15, fontWeight: 600 }}>{def.title}</Typography>
      <Typography sx={{ fontSize: 12, color: nb.textMuted, mb: 1.75 }}>{def.intro}</Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.75 }}>
        {def.fields.map((f) => {
          const v = values[f.key];
          if (f.type === 'bool') {
            return (
              <FormControlLabel
                key={f.key}
                control={<Switch checked={!!v} onChange={(e) => setValues((s) => ({ ...s, [f.key]: e.target.checked }))} />}
                label={<Typography sx={{ fontSize: 13 }}>{f.label}</Typography>}
              />
            );
          }
          if (f.type === 'date') {
            return (
              <TextField
                key={f.key}
                size="small"
                type="date"
                label={f.label}
                value={String(v ?? '')}
                onChange={(e) => setValues((s) => ({ ...s, [f.key]: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                error={!!errors[f.key]}
                helperText={errors[f.key] || ' '}
              />
            );
          }
          if (f.type === 'weekday') {
            return (
              <TextField
                key={f.key}
                select
                size="small"
                label={f.label}
                value={Number(v)}
                onChange={(e) => setValues((s) => ({ ...s, [f.key]: Number(e.target.value) }))}
              >
                {WEEKDAYS.map((d, i) => (
                  <MenuItem key={d} value={i + 1}>
                    {d}
                  </MenuItem>
                ))}
              </TextField>
            );
          }
          return (
            <TextField
              key={f.key}
              size="small"
              type="number"
              label={f.label}
              value={v ?? ''}
              onChange={(e) => setValues((s) => ({ ...s, [f.key]: e.target.value === '' ? 0 : Number(e.target.value) }))}
              error={!!errors[f.key]}
              helperText={errors[f.key] || f.help || ' '}
            />
          );
        })}
      </Box>
      <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
        <Button variant="contained" size="small" disabled={!dirty || saving} onClick={save}>
          Kaydet
        </Button>
        <Button size="small" disabled={!dirty || saving} onClick={() => setValues(initial)}>
          Vazgeç
        </Button>
      </Stack>
    </Box>
  );
}

export default function NbOpsSettings() {
  const [settings, setSettings] = useState<NbSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [undo, setUndo] = useState<NbUndoState | null>(null);

  const load = async () => {
    try {
      setSettings(await nbOpsService.settings());
    } catch (e) {
      setError(nbErrorMessage(e, 'Ayarlar yüklenemedi.'));
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <Box>
      <NbPageHeader
        crumb="NartBusiness · Analitik & Sistem"
        title="Operasyon Ayarları"
        subtitle="Eşleştirme, deneme sonu akışı, haftalık bülten ve dönüşüm hedefleri. Değişiklikler bir dakika içinde geçerli olur."
      />
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {!settings ? (
        !error && <CircularProgress size={24} />
      ) : (
        GROUPS.map((g) => (
          <GroupForm
            key={g.group}
            def={g}
            initial={settings[g.group] as unknown as Values}
            onSaved={(msg) => {
              setUndo({ message: msg });
              void load();
            }}
          />
        ))
      )}
      <NbUndoToast state={undo} onClose={() => setUndo(null)} />
    </Box>
  );
}
