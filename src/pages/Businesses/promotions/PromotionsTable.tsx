import { useMemo, useState } from 'react';
import {
  Box, Button, Chip, IconButton, InputAdornment, ListItemIcon, Menu, MenuItem, Stack, Table, TableBody, TableCell,
  TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import MoreIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/EditOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import SearchIcon from '@mui/icons-material/Search';
import type { PromotionPurchase } from '../../../services/business/promotionAdminService';
import { RemainingBar, TONE, daysUntil, fmtDate, isLive, scopeLine } from './shared';

const PAGE = 10;

export type RowState = 'live' | 'queued' | 'ended' | 'failed' | 'refund';

/** Kaydın şu anki durumu: yayında, sırada (başlangıcı ileride), bitti, ödeme tamamlanmadı, iade bekliyor. */
export function rowState(p: PromotionPurchase, now = Date.now()): RowState {
  if (p.status === 'REFUND_NEEDED') return 'refund';
  if (p.status !== 'ACTIVE') return 'failed';
  if (isLive(p, now)) return 'live';
  if (p.startsAt && new Date(p.startsAt).getTime() > now) return 'queued';
  return 'ended';
}

const STATE_CHIP: Record<RowState, { label: string; color: string; bg: string }> = {
  live: { label: 'Yayında', color: TONE.go, bg: TONE.goBg },
  queued: { label: 'Sırada', color: '#1d4f91', bg: '#e8eff9' },
  ended: { label: 'Bitti', color: TONE.quiet, bg: '#f1f2f4' },
  failed: { label: 'Ödeme tamamlanmadı', color: TONE.quiet, bg: '#f1f2f4' },
  refund: { label: 'İade bekliyor', color: TONE.warn, bg: TONE.warnBg },
};

/** Düzenlenebilir: admin denemesi, yayında ya da sırada. Ücretli kayıt iade akışından geçer. */
export const editable = (p: PromotionPurchase) => p.trial && (rowState(p) === 'live' || rowState(p) === 'queued');

const pct = (clicks: number, views: number) =>
  views > 0 ? `%${((clicks / views) * 100).toFixed(1).replace('.', ',')}` : '—';

/**
 * Öne çıkarma tablosu: Yayında, Denemeler ve Geçmiş sekmeleri aynı tabloyu kullanır.
 * Arama işletme adında ve notta; sayfalama "daha göster" ile.
 */
export default function PromotionsTable({ rows, empty, onEdit, onRemove }: {
  rows: PromotionPurchase[];
  empty: string;
  onEdit: (p: PromotionPurchase) => void;
  onRemove: (p: PromotionPurchase) => void;
}) {
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [menu, setMenu] = useState<{ el: HTMLElement; row: PromotionPurchase } | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase('tr');
    if (!needle) return rows;
    return rows.filter((p) => `${p.businessName ?? ''} ${p.note ?? ''} ${p.province ?? ''}`.toLocaleLowerCase('tr').includes(needle));
  }, [rows, q]);

  if (rows.length === 0) {
    return (
      <Box sx={{ px: 3, py: 5, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">{empty}</Typography>
      </Box>
    );
  }

  const shown = filtered.slice(0, limit);
  const rest = filtered.length - shown.length;

  return (
    <>
      {rows.length > 5 && (
        <Box sx={{ px: 2.5, pt: 2, pb: 1 }}>
          <TextField size="small" placeholder="İşletme, il ya da notta ara" value={q}
            onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }} sx={{ width: { xs: '100%', sm: 320 } }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
        </Box>
      )}
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 820, '& td, & th': { borderColor: 'divider' } }}>
          <TableHead>
            <TableRow sx={{ '& th': { color: 'text.secondary', fontSize: 12, fontWeight: 600, py: 1.25 } }}>
              <TableCell sx={{ pl: 2.5 }}>İşletme</TableCell>
              <TableCell>Durum</TableCell>
              <TableCell>Dönem</TableCell>
              <TableCell sx={{ width: 140 }}>Kalan</TableCell>
              <TableCell align="right">Görüntülenme</TableCell>
              <TableCell align="right">Tıklama</TableCell>
              <TableCell align="right">Oran</TableCell>
              <TableCell sx={{ width: 40, px: 0.5 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {shown.map((p) => {
              const st = rowState(p);
              const chip = STATE_CHIP[st];
              const startsIn = st === 'queued' ? daysUntil(p.startsAt) : null;
              return (
                <TableRow key={p.id} hover sx={{ '& td': { py: 1.5 } }}>
                  <TableCell sx={{ pl: 2.5, maxWidth: 260 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 220 }}>{p.businessName ?? p.businessId}</Typography>
                      <Chip size="small" label={p.trial ? 'Deneme' : 'Sponsorlu'}
                        sx={{ height: 20, fontSize: 11, fontWeight: 700,
                          bgcolor: p.trial ? TONE.goBg : '#f6efe0', color: p.trial ? TONE.go : '#7a5a14' }} />
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {scopeLine(p)}{!p.trial && p.amount > 0 ? ` · ${p.amount.toLocaleString('tr-TR')} ₺` : ''}
                    </Typography>
                    {p.note && (
                      <Tooltip title={p.grantedBy ? `${p.note} · tanımlayan: ${p.grantedBy}` : p.note}>
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', fontStyle: 'italic', maxWidth: 230 }}>
                          {p.note}
                        </Typography>
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={chip.label}
                      sx={{ height: 22, fontSize: 12, fontWeight: 600, bgcolor: chip.bg, color: chip.color }} />
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    <Typography variant="body2">{p.startsAt ? `${fmtDate(p.startsAt)} – ${fmtDate(p.endsAt)}` : fmtDate(p.createdAt)}</Typography>
                    <Typography variant="caption" color="text.secondary">{p.days} gün</Typography>
                  </TableCell>
                  <TableCell>
                    {st === 'live' && <RemainingBar endsAt={p.endsAt} days={p.days} />}
                    {st === 'queued' && (
                      <Typography variant="body2" color="text.secondary">
                        {startsIn != null && startsIn > 0 ? `${startsIn} gün sonra başlar` : 'bugün başlar'}
                      </Typography>
                    )}
                    {st !== 'live' && st !== 'queued' && <Typography variant="body2" color="text.secondary">—</Typography>}
                  </TableCell>
                  <TableCell align="right">{p.views.toLocaleString('tr-TR')}</TableCell>
                  <TableCell align="right">{p.clicks.toLocaleString('tr-TR')}</TableCell>
                  <TableCell align="right" sx={{ color: 'text.secondary' }}>{pct(p.clicks, p.views)}</TableCell>
                  <TableCell sx={{ px: 0.5 }}>
                    {editable(p) && (
                      <IconButton size="small" aria-label="Deneme işlemleri" onClick={(e) => setMenu({ el: e.currentTarget, row: p })}>
                        <MoreIcon fontSize="small" />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>
      {filtered.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ px: 2.5, py: 3 }}>“{q}” için kayıt yok.</Typography>
      )}
      {rest > 0 && (
        <Box sx={{ px: 2.5, py: 1.5 }}>
          <Button size="small" onClick={() => setLimit(limit + PAGE)}>{rest} kayıt daha göster</Button>
        </Box>
      )}
      <Menu anchorEl={menu?.el} open={!!menu} onClose={() => setMenu(null)}>
        <MenuItem onClick={() => { if (menu) onEdit(menu.row); setMenu(null); }}>
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>Düzenle
        </MenuItem>
        <MenuItem onClick={() => { if (menu) onRemove(menu.row); setMenu(null); }} sx={{ color: 'error.main' }}>
          <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>Denemeyi kaldır
        </MenuItem>
      </Menu>
    </>
  );
}
