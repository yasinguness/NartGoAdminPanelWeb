import { useNavigate } from 'react-router-dom';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import ArrowIcon from '@mui/icons-material/ArrowForward';
import type { HeritageAdminStats } from '../../services/dashboardStatsService';

/**
 * "Ortak Hafıza" — köy ve sülale birikimi, bu hafta kimin ilerlediği.
 *
 * `deltaPct` yüzde PUANI farkıdır (%22'den %44'e çıkmak +22 puan), oran
 * değil; bu yüzden "+22" diye gösteriliyor, "%22 arttı" değil.
 *
 * `villageId` veritabanında UUID — sayı değil; köy sayfasına giderken olduğu
 * gibi kullanılıyor.
 */
export default function HeritageStatsCard({ data }: { data: HeritageAdminStats }) {
  const navigate = useNavigate();
  const top = data.topProgressVillages.slice(0, 3);

  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, p: 2.5 }}>
      <Stack direction="row" alignItems="baseline" sx={{ mb: 2 }}>
        <Typography fontWeight={700} sx={{ flex: 1 }}>Ortak Hafıza</Typography>
        <Button size="small" endIcon={<ArrowIcon sx={{ fontSize: 14 }} />}
          onClick={() => navigate('/heritage/families')}>
          Atlası aç
        </Button>
      </Stack>

      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
        <Tile label="Köy" value={data.villages.total}
          hint={`${data.villages.withConfirmedLocation.toLocaleString('tr-TR')} konum teyitli`} />
        <Tile label="Sülale" value={data.families.total}
          hint={`${data.families.linkedToVillage.toLocaleString('tr-TR')} köye bağlı`} />
        <Tile label="Bu hafta katkı" value={data.contributions7d.count}
          hint={`${data.contributions7d.contributors.toLocaleString('tr-TR')} kişiden`} />
      </Stack>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        Bu hafta en çok ilerleyen köyler
      </Typography>

      {top.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Bu hafta tamamlanma oranı artan köy yok.
        </Typography>
      ) : (
        <Stack spacing={0.75}>
          {top.map((v) => (
            <Stack key={v.villageId} direction="row" alignItems="center" spacing={1}
              onClick={() => navigate(`/heritage/villages?q=${encodeURIComponent(v.name)}`)}
              role="link" tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/heritage/villages?q=${encodeURIComponent(v.name)}`); }}
              sx={{ cursor: 'pointer', borderRadius: 1, px: 0.5, py: 0.25, '&:hover': { bgcolor: 'action.hover' } }}>
              <Typography variant="body2" sx={{ flex: 1 }} noWrap>
                {v.name}{v.province ? ` · ${v.province}` : ''}
              </Typography>
              <Typography variant="body2" fontWeight={600}>%{v.completionPct}</Typography>
              <Typography variant="caption" sx={{ color: '#1f5132', minWidth: 34, textAlign: 'right' }}>
                +{v.deltaPct}
              </Typography>
            </Stack>
          ))}
        </Stack>
      )}
    </Paper>
  );
}

function Tile({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <Box sx={{ flex: 1, px: 1.5, py: 1.25, borderRadius: 2, bgcolor: 'action.hover', minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" display="block" noWrap>{label}</Typography>
      <Typography sx={{ fontSize: 22, fontWeight: 700, lineHeight: 1.2 }}>
        {value.toLocaleString('tr-TR')}
      </Typography>
      <Typography variant="caption" color="text.secondary" noWrap display="block">{hint}</Typography>
    </Box>
  );
}
