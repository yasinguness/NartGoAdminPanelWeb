import React, { useState } from 'react';
import { Card, CardContent, CardHeader, FormControlLabel, Switch, Typography } from '@mui/material';
import { useSnackbar } from 'notistack';
import { associationService } from '../../../services/association/associationService';
import { AssociationDto } from '../../../types/association/associationDto';

/**
 * NartPremium katılımı (docs/plan/nartgo-premium-dernek.md). Açık olan dernek satın alma ekranında seçilebilir
 * ve "yakındaki dernekler"de görünür. Yalnız derneğin onayıyla açılır; ödeme NartGo'ya gelir.
 */
const AssociationPremiumCard: React.FC<{ association: AssociationDto }> = ({ association }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [on, setOn] = useState<boolean>(!!association.premiumPartner);
  const [busy, setBusy] = useState(false);

  const toggle = async (next: boolean) => {
    setBusy(true);
    try {
      await associationService.setPremiumPartner(association.id, next);
      setOn(next);
      enqueueSnackbar(next ? 'Dernek NartPremium\'a katıldı.' : 'Dernek NartPremium\'dan çıkarıldı.', { variant: 'success' });
    } catch {
      enqueueSnackbar('Değişiklik kaydedilemedi.', { variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card sx={{ borderRadius: 2, boxShadow: 1 }}>
      <CardHeader title="NartPremium" titleTypographyProps={{ variant: 'h6', fontWeight: 'medium' }} sx={{ pb: 1 }} />
      <CardContent sx={{ pt: 0 }}>
        <FormControlLabel
          control={<Switch checked={on} disabled={busy} onChange={(e) => toggle(e.target.checked)} />}
          label={on ? 'Pakete Katıldı' : 'Pakete Katılmadı'}
        />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Açıkken kullanıcılar bu derneği seçerek NartPremium alabilir ve dernek "yakındaki dernekler"de görünür.
          Yalnız derneğin onayıyla açın. Ödeme NartGo'ya yapılır, derneğe gitmez.
        </Typography>
      </CardContent>
    </Card>
  );
};

export default AssociationPremiumCard;
