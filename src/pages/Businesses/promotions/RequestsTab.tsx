import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Box, Button, Collapse, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from '@mui/material';
import BuildIcon from '@mui/icons-material/BuildOutlined';
import EligibilityFixer from './EligibilityFixer';
import {
  promotionAdminService, SCOPE_LABEL,
  type PromotionOffer, type PromotionPurchase,
} from '../../../services/business/promotionAdminService';
import { CheckChips, SlotChip, TONE, fmtDateShort, tl, titleCase } from './shared';

/**
 * Bekleyen işler.
 *
 * Tasarımda bu sekme "Talepler" ve her satırda Onayla/Reddet var. O akış
 * sunucuda yok: `PromotionPurchaseStatus` dokümantasyonu "ACTIVE: ödendi ve
 * öne çıkarma başladı (onay yok)" diyor, ödeme ön provizyonla değil doğrudan
 * tahsil ediliyor ve onay/ret/fotoğraf-iste uçları bulunmuyor.
 *
 * Bugün gerçekten admin kararı bekleyen iki şey var ve ikisinin de başka
 * yerde evi yoktu:
 *  - REFUND_NEEDED: ödeme alındı ama yayına alınamadı (yer doldu, işletme
 *    kapandı). Admin iyzico'dan iade edip burada kapatır.
 *  - FAILED: ödeme tamamlanmadı; takip gerekebilir.
 *
 * Satır düzeni tasarımdaki tabloyla aynı: işletme, paket, tutar, kontroller,
 * karar. Kontroller sütunu `GET /businesses/{id}/promotion` ile besleniyor,
 * yani "fotoğraf var mı", "yer dolu mu" gerçek veriden geliyor.
 */
export default function RequestsTab({ rows, onRefunded, busyId }: {
  rows: PromotionPurchase[];
  onRefunded: (id: string) => void;
  busyId: string | null;
}) {
  if (rows.length === 0) {
    return (
      <Box sx={{ px: 2.5, py: 4 }}>
        <Typography variant="body2" color="text.secondary">
          Bekleyen iş yok: iade bekleyen ya da ödemesi tamamlanmamış kayıt görünmüyor.
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ px: 2.5, pb: 2 }}>
        <Alert severity="info" icon={false}
          sx={{ bgcolor: 'action.hover', color: 'text.secondary', py: 0.75 }}>
          Ödeme alınır alınmaz öne çıkarma başlar; ayrı bir onay adımı yoktur. Buradaki kayıtlar ödemesi
          alındığı hâlde yayına alınamayan ya da ödemesi tamamlanmayan satın almalar.
        </Alert>
      </Box>
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 900 }}>
          <TableHead>
            <TableRow>
              <TableCell>İşletme</TableCell>
              <TableCell>Paket</TableCell>
              <TableCell align="right">Tutar</TableCell>
              <TableCell>Kontroller</TableCell>
              <TableCell align="right">Karar</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((p) => (
              <RequestRow key={p.id} p={p} onRefunded={onRefunded} busy={busyId === p.id} />
            ))}
          </TableBody>
        </Table>
      </Box>
      <Box sx={{ px: 2.5, py: 1.75 }}>
        <Typography variant="caption" color="text.secondary">
          İadeyi iyzico panelinden yaptıktan sonra kaydı burada kapat; ana sayfadaki uyarı da düşer.
        </Typography>
      </Box>
    </>
  );
}

function RequestRow({ p, onRefunded, busy }: {
  p: PromotionPurchase; onRefunded: (id: string) => void; busy: boolean;
}) {
  const [offer, setOffer] = useState<PromotionOffer | null>(null);
  const [fixing, setFixing] = useState(false);

  const loadOffer = useCallback(async () => {
    try {
      setOffer(await promotionAdminService.offerFor(p.businessId));
    } catch {
      /* kontroller gösterilemez; satır yine de çalışır */
    }
  }, [p.businessId]);

  // Kontroller sütunu: işletmenin uygunluğu ve ilin doluluğu.
  useEffect(() => { void loadOffer(); }, [loadOffer]);

  const refundNeeded = p.status === 'REFUND_NEEDED';
  const missing = offer?.eligibility.missing ?? [];

  return (
    <TableRow sx={{ bgcolor: refundNeeded ? TONE.warnBg : undefined }}>
      <TableCell sx={{ verticalAlign: 'top' }}>
        <Typography variant="body2" fontWeight={600}>{p.businessName ?? p.businessId}</Typography>
        <Typography variant="caption" color="text.secondary">
          {[p.province ? titleCase(p.province) : null, fmtDateShort(p.createdAt)].filter(Boolean).join(' · ')}
        </Typography>
        {p.buyerEmail && (
          <Typography variant="caption" display="block" color="text.secondary">{p.buyerEmail}</Typography>
        )}
      </TableCell>
      <TableCell sx={{ verticalAlign: 'top' }}>
        <Typography variant="body2">
          {SCOPE_LABEL[p.scope]} · {p.days} gün{p.includeStory ? ' + hikâye' : ''}
        </Typography>
        <Typography variant="caption" sx={{ color: refundNeeded ? TONE.warn : 'text.secondary' }}>
          {refundNeeded ? 'Ödendi ama yayına alınamadı' : 'Ödeme tamamlanmadı'}
        </Typography>
      </TableCell>
      <TableCell align="right" sx={{ verticalAlign: 'top', whiteSpace: 'nowrap' }}>{tl(p.amount)}</TableCell>
      <TableCell sx={{ verticalAlign: 'top', maxWidth: 420, minWidth: 300, whiteSpace: 'normal' }}>
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
          {offer ? (
            <>
              <CheckChips missing={offer.eligibility.missing} />
              <SlotChip label={offer.city ?? 'İl'} used={offer.slot.used} limit={offer.slot.limit} />
            </>
          ) : (
            <Typography variant="caption" color="text.secondary">kontrol ediliyor…</Typography>
          )}
        </Stack>
        {p.note && (
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
            {p.note}
          </Typography>
        )}
        {/* Eksiği burada da görünce burada çözebilmeli; aksi hâlde admin
            işletmeyi başka sayfada bulup düzeltip geri dönmek zorunda. */}
        {missing.length > 0 && (
          <>
            <Button size="small" startIcon={<BuildIcon sx={{ fontSize: 15 }} />}
              onClick={() => setFixing((v) => !v)} sx={{ mt: 0.5, px: 0.5 }}>
              {fixing ? 'Düzeltmeyi kapat' : `${missing.length} eksiği düzelt`}
            </Button>
            <Collapse in={fixing} unmountOnExit>
              <EligibilityFixer businessId={p.businessId} missing={missing} onFixed={loadOffer} />
            </Collapse>
          </>
        )}
      </TableCell>
      <TableCell align="right" sx={{ verticalAlign: 'top', whiteSpace: 'nowrap' }}>
        {refundNeeded ? (
          <Button size="small" variant="contained" disabled={busy}
            onClick={() => onRefunded(p.id)}
            sx={{ bgcolor: TONE.go, '&:hover': { bgcolor: '#17402a' } }}>
            {busy ? 'Kapatılıyor…' : 'İade edildi'}
          </Button>
        ) : (
          <Typography variant="caption" color="text.secondary">işlem gerekmiyor</Typography>
        )}
      </TableCell>
    </TableRow>
  );
}


