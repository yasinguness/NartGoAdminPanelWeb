import { useEffect, useState } from 'react';
import {
  Alert, Autocomplete, Box, Button, CircularProgress, Link, Paper, Stack, TextField, Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import WarnIcon from '@mui/icons-material/ErrorOutline';
import UploadIcon from '@mui/icons-material/UploadFile';
import { eligibilityFixService, type SimpleCategory } from '../../../services/business/eligibilityFixService';
import type { BusinessClaimResponse } from '../../../types/businesses/businessClaimModel';
import { MISSING_LABEL } from '../../../services/business/promotionAdminService';
import { TR_CITIES } from '../../../constants/trCities';
import { TONE } from './shared';

/**
 * Uygunluk eksiklerini yerinde giderme.
 *
 * Önceki hâl eksiği yazıp "şuraya git" diyordu; admin paneli terk edip
 * işletmeyi bulup düzeltip geri dönmek zorundaydı. Beş eksiğin beşi de
 * buradan çözülüyor:
 *
 *   CATEGORY  → kategori seç ve kaydet
 *   PHOTO     → profil görseli yükle
 *   CITY      → ili seç (sunucu ili adres metninden çözüyor)
 *   INACTIVE  → yayına al
 *   OWNERSHIP → bekleyen sahiplenme talebini onayla
 *
 * Her düzeltmeden sonra `onFixed` ile uygunluk yeniden okunuyor; çipler ve
 * uyarı canlı güncelleniyor, sayfa yenilemeye gerek kalmıyor.
 */
export default function EligibilityFixer({ businessId, missing, onFixed }: {
  businessId: string;
  missing: string[];
  onFixed: () => void | Promise<void>;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Düzeltmeden sonra uygunluk sunucudan yeniden okunur. Başarılıysa o kod
   * `missing`'ten düşer ve satır kendiliğinden kaybolur — geri bildirim bu.
   * Ayrıca "düzeltildi" durumu tutmuyoruz: istek 200 dönse bile sunucu kodu
   * hâlâ listeliyorsa düzelmemiş demektir, öyleyken "düzeltildi" demek
   * yanıltıcı olurdu.
   */
  const run = async (code: string, fn: () => Promise<unknown>) => {
    setBusy(code); setError(null);
    try {
      await fn();
      await onFixed();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'İşlem tamamlanamadı.');
    } finally { setBusy(null); }
  };

  return (
    <Paper variant="outlined"
      sx={{ mt: 1.5, p: 1.75, borderRadius: 2, bgcolor: TONE.warnBg, borderColor: TONE.warnBorder }}>
      <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mb: 1.5 }}>
        <WarnIcon sx={{ fontSize: 18, color: TONE.warn, mt: '1px' }} />
        <Box>
          <Typography variant="body2" fontWeight={700} sx={{ color: TONE.warn }}>
            Bu işletme öne çıkarılamaz.
          </Typography>
          <Typography variant="caption" sx={{ color: TONE.warn }}>
            Eksikleri buradan giderebilirsin; sunucu düzeltme sonrası kabul eder.
          </Typography>
        </Box>
      </Stack>

      <Stack spacing={1.25}>
        {missing.map((code) => (
          <FixRow
            key={code} code={code} businessId={businessId}
            busy={busy === code} disabled={busy !== null && busy !== code}
            onRun={(fn) => run(code, fn)}
          />
        ))}
      </Stack>

      {error && <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert>}
    </Paper>
  );
}

function FixRow({ code, businessId, busy, disabled, onRun }: {
  code: string; businessId: string; busy: boolean; disabled: boolean;
  onRun: (fn: () => Promise<unknown>) => void;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 1.5, bgcolor: 'background.paper' }}>
      <Stack spacing={1}>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <WarnIcon sx={{ fontSize: 16, color: TONE.warn }} />
          <Typography variant="body2" fontWeight={600}>
            {MISSING_LABEL[code] ?? code}
          </Typography>
        </Stack>
        <Box sx={{ width: '100%' }}>
          <FixControl code={code} businessId={businessId} busy={busy} disabled={disabled} onRun={onRun} />
        </Box>
      </Stack>
    </Paper>
  );
}

function FixControl({ code, businessId, busy, disabled, onRun }: {
  code: string; businessId: string; busy: boolean; disabled: boolean;
  onRun: (fn: () => Promise<unknown>) => void;
}) {
  switch (code) {
    case 'CATEGORY': return <CategoryFix businessId={businessId} busy={busy} disabled={disabled} onRun={onRun} />;
    case 'CITY': return <CityFix businessId={businessId} busy={busy} disabled={disabled} onRun={onRun} />;
    case 'PHOTO': return <PhotoFix businessId={businessId} busy={busy} disabled={disabled} onRun={onRun} />;
    case 'INACTIVE':
      return (
        <Button size="small" variant="outlined" disabled={busy || disabled}
          onClick={() => onRun(() => eligibilityFixService.activate(businessId))}>
          {busy ? 'Açılıyor…' : 'Yayına al'}
        </Button>
      );
    case 'OWNERSHIP': return <OwnershipFix businessId={businessId} busy={busy} disabled={disabled} onRun={onRun} />;
    default:
      return (
        <Typography variant="caption" color="text.secondary">
          Bu kontrol panelde tanımlı değil; sunucu yeni bir kural eklemiş olabilir.
        </Typography>
      );
  }
}

function CategoryFix({ businessId, busy, disabled, onRun }: {
  businessId: string; busy: boolean; disabled: boolean; onRun: (fn: () => Promise<unknown>) => void;
}) {
  const [options, setOptions] = useState<SimpleCategory[]>([]);
  const [value, setValue] = useState<SimpleCategory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    eligibilityFixService.categories()
      .then((c) => { if (alive) setOptions(c); })
      .catch(() => { if (alive) setOptions([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Autocomplete
        size="small" sx={{ flex: 1, minWidth: 0 }}
        options={options} value={value} loading={loading}
        onChange={(_, v) => setValue(v)}
        isOptionEqualToValue={(o, v) => o.id === v.id}
        getOptionLabel={(o) => o.name}
        noOptionsText="Kategori bulunamadı"
        renderInput={(p) => (
          <TextField {...p} placeholder="Kategori seç"
            InputProps={{ ...p.InputProps,
              endAdornment: (<>{loading ? <CircularProgress size={14} /> : null}{p.InputProps.endAdornment}</>) }} />
        )}
      />
      <Button size="small" variant="contained" disabled={!value || busy || disabled}
        onClick={() => value && onRun(() => eligibilityFixService.categorize(businessId, value.id))}
        sx={{ bgcolor: TONE.go, '&:hover': { bgcolor: '#17402a' } }}>
        {busy ? '…' : 'Kaydet'}
      </Button>
    </Stack>
  );
}

function CityFix({ businessId, busy, disabled, onRun }: {
  businessId: string; busy: boolean; disabled: boolean; onRun: (fn: () => Promise<unknown>) => void;
}) {
  const [city, setCity] = useState<string | null>(null);
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Autocomplete
        size="small" sx={{ flex: 1, minWidth: 0 }}
        options={TR_CITIES as string[]} value={city}
        onChange={(_, v) => setCity(v)}
        renderInput={(p) => <TextField {...p} placeholder="İl seç" helperText="Sunucu ili adresten çözüyor." />}
      />
      <Button size="small" variant="contained" disabled={!city || busy || disabled}
        onClick={() => city && onRun(() => eligibilityFixService.setCity(businessId, city))}
        sx={{ bgcolor: TONE.go, '&:hover': { bgcolor: '#17402a' } }}>
        {busy ? '…' : 'Kaydet'}
      </Button>
    </Stack>
  );
}

function PhotoFix({ businessId, busy, disabled, onRun }: {
  businessId: string; busy: boolean; disabled: boolean; onRun: (fn: () => Promise<unknown>) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  return (
    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
      <Button size="small" variant="outlined" component="label" startIcon={<UploadIcon />} disabled={disabled}>
        {file ? file.name.slice(0, 22) : 'Görsel seç'}
        <input hidden type="file" accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </Button>
      <Button size="small" variant="contained" disabled={!file || busy || disabled}
        onClick={() => file && onRun(() => eligibilityFixService.uploadPhoto(businessId, file))}
        sx={{ bgcolor: TONE.go, '&:hover': { bgcolor: '#17402a' } }}>
        {busy ? 'Yükleniyor…' : 'Yükle'}
      </Button>
    </Stack>
  );
}

function OwnershipFix({ businessId, busy, disabled, onRun }: {
  businessId: string; busy: boolean; disabled: boolean; onRun: (fn: () => Promise<unknown>) => void;
}) {
  const [claim, setClaim] = useState<BusinessClaimResponse | null | undefined>(undefined);
  const [owner, setOwner] = useState<{ id: string; label: string } | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    eligibilityFixService.pendingClaim(businessId)
      .then((c) => { if (alive) setClaim(c); })
      .catch(() => { if (alive) setClaim(null); });
    eligibilityFixService.declaredOwner(businessId)
      .then((o) => { if (alive) setOwner(o); })
      .catch(() => { if (alive) setOwner(null); });
    return () => { alive = false; };
  }, [businessId]);

  if (claim === undefined || owner === undefined) {
    return <Typography variant="caption" color="text.secondary">Sahiplik durumu okunuyor…</Typography>;
  }

  if (!claim) {
    /*
     * Sahiplik yalnız onaylı talep ile kapanıyor; talep yoksa admin'in
     * onaylayacağı bir şey de yok. Uydurma bir onay üretmek yerine durumu
     * olduğu gibi söyle.
     *
     * Bu, rehberdeki işletmelerin çoğunda beklenen hâl: claim_status
     * varsayılanı NONE ve Google Maps içe aktarması da NONE yazıyor, yani
     * sahibi uygulamadan talep göndermemiş her kayıt burada takılıyor.
     */
    return (
      <Stack spacing={0.5}>
        {owner ? (
          <>
            <Typography variant="caption" sx={{ color: TONE.warn, fontWeight: 600 }}>
              Sahibi var, doğrulanmamış: {owner.label}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Bu kişi işletmeyi kendisi eklemiş ve düzenleyebiliyor, ama sahipliği beyan
              düzeyinde. Sunucu öne çıkarma için <b>onaylı sahiplenme talebi</b> arıyor;
              bu kişinin uygulamadan talep göndermesi ve burada onaylanması gerekiyor.
            </Typography>
          </>
        ) : (
          <Typography variant="caption" color="text.secondary">
            Bu işletmenin kayıtlı sahibi yok ve bekleyen sahiplenme talebi de yok.
            Rehbere dışarıdan eklenen işletmeler bu durumda.
          </Typography>
        )}
        <Typography variant="caption" color="text.secondary">
          Sahiplik panelden elle işaretlenemiyor.{' '}
          <Link component={RouterLink} to="/business-claims?status=PENDING">
            Bekleyen talepler
          </Link>
          .
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
      <Typography variant="caption" color="text.secondary" sx={{ flex: 1, minWidth: 160 }}>
        {claim.requesterEmail} talep etmiş
        {claim.verificationMethod ? ` · ${claim.verificationMethod}` : ''}
      </Typography>
      <Button size="small" variant="contained" disabled={busy || disabled}
        onClick={() => onRun(() => eligibilityFixService.approveClaim(
          claim.claimId, 'Öne çıkarma için panelden onaylandı'))}
        sx={{ bgcolor: TONE.go, '&:hover': { bgcolor: '#17402a' } }}>
        {busy ? 'Onaylanıyor…' : 'Talebi onayla'}
      </Button>
    </Stack>
  );
}
