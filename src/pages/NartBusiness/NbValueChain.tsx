import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Paper,
  Slider,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Upload as UploadIcon,
} from '@mui/icons-material';
import { nbAdminService } from '../../services/nartbusiness/nbAdminService';
import { NbTitleBlock } from '../../components/nartbusiness/ui';
import type {
  ChainDirection,
  Sector,
  ValueChainBulkImportResult,
  ValueChainEdge,
  ValueChainEdgeCreate,
} from '../../services/nartbusiness/nbTypes';
import {
  CatalogAutocomplete,
  RadioCardGroup,
  useNbMobile,
  type RadioCardOption,
} from '../../components/nartbusiness';

const DIRECTIONS: { value: ChainDirection; label: string }[] = [
  { value: 'SUPPLIES_TO', label: 'Tedarik eder →' },
  { value: 'BUYS_FROM', label: 'Satın alır ←' },
  { value: 'COLLABORATES', label: 'İşbirliği ↔' },
];

const DIRECTION_OPTIONS: RadioCardOption<ChainDirection>[] = [
  {
    value: 'SUPPLIES_TO',
    title: 'Tedarik eder →',
    description: 'Kaynak sektör, hedef sektöre ürün/hizmet sağlar (örn. Tarım → Gıda).',
  },
  {
    value: 'BUYS_FROM',
    title: 'Satın alır ←',
    description: 'Kaynak sektör, hedef sektörden tedarik alır (örn. Restoran ← Tarım).',
  },
  {
    value: 'COLLABORATES',
    title: 'İşbirliği ↔',
    description: 'Yön bağımsız işbirliği — joint venture, ortak proje (simetrik).',
  },
];

/** Weight (uygunluk skoru) için anlamsal segmentler — matching algoritması bu skoru kullanır. */
function weightTier(w: number): { label: string; hint: string; color: 'success' | 'warning' | 'default' } {
  if (w >= 0.7) return {
    label: 'Güçlü ilişki',
    hint: 'Algoritma bu eşleşmeyi öncelikli olarak önerir.',
    color: 'success',
  };
  if (w >= 0.4) return {
    label: 'Orta ilişki',
    hint: 'Önerilebilir ama daha güçlü adaylar varsa onlar öne çıkar.',
    color: 'warning',
  };
  return {
    label: 'Zayıf ilişki',
    hint: 'Algoritma neredeyse hiç önermez. 0.4 altı edge\'leri silmeyi düşün.',
    color: 'default',
  };
}

type DraftEdge = {
  id?: string;
  sourceSector: string;
  targetSector: string;
  direction: ChainDirection;
  weight: number;
  notes: string;
  active: boolean;
  /** Yalnızca yeni kenar oluştururken anlamlı; mevcut kenarı düzenlerken set edilmez. */
  alsoReverse?: boolean;
};

const EMPTY_DRAFT: DraftEdge = {
  sourceSector: '',
  targetSector: '',
  direction: 'SUPPLIES_TO',
  weight: 0.5,
  notes: '',
  active: true,
  alsoReverse: false,
};

/**
 * NartBusiness — Sektör Değer Zinciri Matrisi.
 *
 * Görünümler:
 *  - List: kenar tablosu (sortable)
 *  - Matrix: source × target heatmap (en yüksek weight gösterilir)
 *
 * Matching algoritması bu matrisi MatchingService.suggestionsFor içinde okur.
 */
export default function NbValueChain() {
  const fullScreen = useNbMobile();
  const [view, setView] = useState<'list' | 'matrix'>('list');
  const [edges, setEdges] = useState<ValueChainEdge[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftEdge | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importUpsert, setImportUpsert] = useState(true);
  const [importResult, setImportResult] = useState<ValueChainBulkImportResult | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ValueChainEdge | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [es, ss] = await Promise.all([
        nbAdminService.listValueChain(),
        nbAdminService.listSectors(),
      ]);
      setEdges(es);
      setSectors(ss);
    } catch (e: any) {
      setError(e?.message ?? 'Veri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    if (!draft) return;
    setSubmitting(true);
    try {
      if (draft.id) {
        await nbAdminService.updateValueChain(draft.id, {
          weight: draft.weight,
          notes: draft.notes,
          active: draft.active,
        });
      } else {
        await nbAdminService.createValueChain({
          sourceSector: draft.sourceSector,
          targetSector: draft.targetSector,
          direction: draft.direction,
          weight: draft.weight,
          notes: draft.notes,
          alsoReverse: draft.alsoReverse,
        });
      }
      setDraft(null);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Kaydetme başarısız');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await nbAdminService.deleteValueChain(id);
      setConfirmDelete(null);
      await load();
    } catch (e: any) {
      setError(e?.message ?? 'Silme başarısız');
    }
  };

  // Matrix gösterimi için: source -> target -> max weight (yön farketmeksizin)
  const matrix = useMemo(() => {
    const m = new Map<string, Map<string, number>>();
    for (const e of edges) {
      if (!e.active) continue;
      const a = e.sourceSector;
      const b = e.targetSector;
      const inner = m.get(a) ?? new Map();
      const prev = inner.get(b) ?? 0;
      if (e.weight > prev) inner.set(b, e.weight);
      m.set(a, inner);
    }
    return m;
  }, [edges]);

  const sectorList = sectors.filter((s) => s.active);

  return (
    <Box sx={{ maxWidth: 1400 }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
        mb={2}
      >
        <Box>
          <NbTitleBlock title="Sektör Değer Zinciri" />
          <Typography variant="body2" color="text.secondary">
            Matching algoritmasının kural-tabanlı tarafı. Her kenar bir
            (source → target) tedarik/işbirliği ilişkisi tanımlar; weight 0.0-1.0
            arası uygunluk skorudur.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={() => {
              setImportText('');
              setImportResult(null);
              setImportOpen(true);
            }}
          >
            CSV İçe Aktar
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDraft({ ...EMPTY_DRAFT })}
          >
            Yeni Kenar
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Tabs
        value={view}
        onChange={(_, v) => setView(v)}
        sx={{ mb: 2 }}
      >
        <Tab label="Liste" value="list" />
        <Tab label="Matris" value="matrix" />
      </Tabs>

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : view === 'list' ? (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Kaynak</TableCell>
                <TableCell>Yön</TableCell>
                <TableCell>Hedef</TableCell>
                <TableCell>Weight</TableCell>
                <TableCell>Notlar</TableCell>
                <TableCell>Aktif</TableCell>
                <TableCell align="right">İşlem</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {edges.map((e) => (
                <TableRow key={e.id} hover>
                  <TableCell>
                    <Typography fontFamily="monospace" variant="body2">
                      {e.sourceSector}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={DIRECTIONS.find((d) => d.value === e.direction)?.label}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography fontFamily="monospace" variant="body2">
                      {e.targetSector}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      color={e.weight >= 0.7 ? 'success' : e.weight >= 0.4 ? 'warning' : 'default'}
                      label={e.weight.toFixed(2)}
                    />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 240 }}>
                    <Typography variant="body2" noWrap title={e.notes ?? ''}>
                      {e.notes ?? '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {e.active ? <Chip size="small" label="Aktif" color="success" /> : <Chip size="small" label="Pasif" />}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() =>
                        setDraft({
                          id: e.id,
                          sourceSector: e.sourceSector,
                          targetSector: e.targetSector,
                          direction: e.direction,
                          weight: e.weight,
                          notes: e.notes ?? '',
                          active: e.active,
                        })
                      }
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => setConfirmDelete(e)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {edges.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography variant="body2" color="text.secondary" py={3}>
                      Henüz tanımlı kenar yok. Sağ üstten ekleyin.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Paper sx={{ overflowX: 'auto' }}>
          <Box sx={{ minWidth: 60 + sectorList.length * 70 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 2 }}>
                    src \ tgt
                  </TableCell>
                  {sectorList.map((s) => (
                    <Tooltip key={s.code} title={s.nameTr}>
                      <TableCell align="center" sx={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: 120 }}>
                        <Typography variant="caption" fontFamily="monospace">
                          {s.code}
                        </Typography>
                      </TableCell>
                    </Tooltip>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {sectorList.map((row) => (
                  <TableRow key={row.code}>
                    <TableCell
                      sx={{ position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 1 }}
                    >
                      <Tooltip title={row.nameTr}>
                        <Typography variant="caption" fontFamily="monospace">
                          {row.code}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    {sectorList.map((col) => {
                      const w = matrix.get(row.code)?.get(col.code) ?? 0;
                      const self = row.code === col.code;
                      return (
                        <TableCell
                          key={col.code}
                          align="center"
                          sx={{
                            bgcolor: self
                              ? 'action.disabledBackground'
                              : w > 0
                              ? `rgba(46, 125, 50, ${0.2 + w * 0.6})`
                              : 'transparent',
                            cursor: self ? 'not-allowed' : 'pointer',
                            minWidth: 50,
                          }}
                          onClick={() => {
                            if (self) return;
                            const existing = edges.find(
                              (e) => e.sourceSector === row.code && e.targetSector === col.code,
                            );
                            if (existing) {
                              setDraft({
                                id: existing.id,
                                sourceSector: existing.sourceSector,
                                targetSector: existing.targetSector,
                                direction: existing.direction,
                                weight: existing.weight,
                                notes: existing.notes ?? '',
                                active: existing.active,
                              });
                            } else {
                              setDraft({
                                ...EMPTY_DRAFT,
                                sourceSector: row.code,
                                targetSector: col.code,
                              });
                            }
                          }}
                        >
                          {self ? '—' : w > 0 ? w.toFixed(2) : ''}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      )}

      <Dialog open={!!draft} onClose={() => setDraft(null)} maxWidth="sm" fullWidth fullScreen={fullScreen}>
        <DialogTitle>{draft?.id ? 'Kenar Düzenle' : 'Yeni Kenar'}</DialogTitle>
        <DialogContent dividers>
          {draft && (() => {
            const sameSector =
              !!draft.sourceSector &&
              !!draft.targetSector &&
              draft.sourceSector === draft.targetSector;
            const duplicateEdge =
              !draft.id &&
              !!draft.sourceSector &&
              !!draft.targetSector &&
              edges.some(
                (e) =>
                  e.sourceSector === draft.sourceSector &&
                  e.targetSector === draft.targetSector &&
                  e.direction === draft.direction,
              );
            const wt = weightTier(draft.weight);
            return (
              <Stack spacing={2}>
                <CatalogAutocomplete<Sector>
                  label="Kaynak Sektör"
                  required
                  disabled={!!draft.id}
                  options={sectorList}
                  value={sectorList.find((s) => s.code === draft.sourceSector) ?? null}
                  onChange={(v) => setDraft({ ...draft, sourceSector: v?.code ?? '' })}
                  getOptionLabel={(s) => `${s.nameTr} (${s.code})`}
                  isOptionEqualToValue={(a, b) => a.code === b.code}
                  placeholder="Aktif sektörlerden seç"
                />
                <CatalogAutocomplete<Sector>
                  label="Hedef Sektör"
                  required
                  disabled={!!draft.id}
                  options={sectorList.filter((s) => s.code !== draft.sourceSector)}
                  value={sectorList.find((s) => s.code === draft.targetSector) ?? null}
                  onChange={(v) => setDraft({ ...draft, targetSector: v?.code ?? '' })}
                  getOptionLabel={(s) => `${s.nameTr} (${s.code})`}
                  isOptionEqualToValue={(a, b) => a.code === b.code}
                  placeholder="Aktif sektörlerden seç"
                />

                {sameSector && (
                  <Alert severity="error">
                    Kaynak ve hedef aynı olamaz — bir sektör kendine bağlanmaz.
                  </Alert>
                )}
                {duplicateEdge && (
                  <Alert severity="warning">
                    Bu (kaynak → hedef, yön) kombinasyonu zaten var. Yeni kenar
                    eklemek yerine mevcut kaydı düzenle.
                  </Alert>
                )}

                <RadioCardGroup<ChainDirection>
                  label="Yön *"
                  options={DIRECTION_OPTIONS}
                  value={draft.direction}
                  onChange={(v) => setDraft({ ...draft, direction: v })}
                  disabled={!!draft.id}
                />

                <Box>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    mb={0.5}
                  >
                    <Typography variant="body2">
                      <b>Weight (uygunluk):</b> {draft.weight.toFixed(2)}
                    </Typography>
                    <Chip size="small" color={wt.color} label={wt.label} />
                  </Stack>
                  <Slider
                    value={draft.weight}
                    onChange={(_, v) => setDraft({ ...draft, weight: v as number })}
                    step={0.05}
                    min={0}
                    max={1}
                    marks={[
                      { value: 0.0, label: '0' },
                      { value: 0.4, label: 'orta' },
                      { value: 0.7, label: 'güçlü' },
                      { value: 1.0, label: '1' },
                    ]}
                    valueLabelDisplay="auto"
                  />
                  <Typography variant="caption" color="text.secondary">
                    {wt.hint}
                  </Typography>
                </Box>

                <TextField
                  label="Notlar"
                  value={draft.notes}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  multiline
                  rows={2}
                  fullWidth
                  helperText="Kuralın gerekçesi — algoritma loglarında görünür."
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={draft.active}
                      onChange={(e) =>
                        setDraft({ ...draft, active: e.target.checked })
                      }
                    />
                  }
                  label="Aktif"
                />

                {!draft.id && draft.direction !== 'COLLABORATES' && (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={!!draft.alsoReverse}
                        onChange={(e) =>
                          setDraft({ ...draft, alsoReverse: e.target.checked })
                        }
                      />
                    }
                    label={
                      draft.direction === 'SUPPLIES_TO'
                        ? 'Zıt yönü de oluştur (BUYS_FROM, aynı weight)'
                        : 'Zıt yönü de oluştur (SUPPLIES_TO, aynı weight)'
                    }
                  />
                )}

                {draft.id && !draft.active && (
                  <Alert severity="info">
                    Pasif kenarlar matching algoritmasında yok sayılır ama silinmez —
                    isteğinde tekrar aktif edebilirsin.
                  </Alert>
                )}
              </Stack>
            );
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDraft(null)}>Vazgeç</Button>
          <Button
            variant="contained"
            onClick={save}
            disabled={
              submitting ||
              !draft ||
              !draft.sourceSector ||
              !draft.targetSector ||
              draft.sourceSector === draft.targetSector ||
              (!draft.id &&
                edges.some(
                  (e) =>
                    e.sourceSector === draft.sourceSector &&
                    e.targetSector === draft.targetSector &&
                    e.direction === draft.direction,
                ))
            }
          >
            {submitting ? 'Kaydediliyor…' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        maxWidth="xs"
        fullWidth
        fullScreen={fullScreen}
      >
        <DialogTitle>Kenarı Sil?</DialogTitle>
        <DialogContent dividers>
          {confirmDelete && (
            <Stack spacing={1.5}>
              <Typography variant="body2">
                Bu kenar matching algoritmasından <b>kalıcı olarak silinecek</b>.
                Pasif yapmak istiyorsan dialog'u kapat ve "Aktif" toggle'ını kullan
                — daha güvenli.
              </Typography>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 1,
                  bgcolor: 'action.hover',
                  fontFamily: 'monospace',
                  fontSize: 13,
                }}
              >
                {confirmDelete.sourceSector} →{' '}
                {DIRECTIONS.find((d) => d.value === confirmDelete.direction)?.label}{' '}
                → {confirmDelete.targetSector}{' '}
                <Chip
                  size="small"
                  label={`w=${confirmDelete.weight.toFixed(2)}`}
                  sx={{ ml: 1 }}
                />
              </Box>
              {confirmDelete.notes && (
                <Typography variant="caption" color="text.secondary">
                  Not: {confirmDelete.notes}
                </Typography>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Vazgeç</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => confirmDelete && remove(confirmDelete.id)}
          >
            Sil
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={importOpen} onClose={() => setImportOpen(false)} maxWidth="md" fullWidth fullScreen={fullScreen}>
        <DialogTitle>CSV İçe Aktar — Sektör Değer Zinciri</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Alert severity="info">
              Her satır bir kenar: <code>sourceSector,targetSector,direction,weight,notes</code>
              <br />
              Direction: SUPPLIES_TO | BUYS_FROM | COLLABORATES — Weight: 0.0 - 1.0
              <br />
              Üst başlık satırı (header) varsa "sourceSector" kelimesini içerirse atlanır.
            </Alert>
            <TextField
              multiline
              minRows={8}
              maxRows={20}
              fullWidth
              placeholder={`# Örnek:\nAGRICULTURE,FOOD_BEVERAGE,SUPPLIES_TO,0.9,birincil tedarik\nMANUFACTURING,LOGISTICS,COLLABORATES,0.7,\nIT_SOFTWARE,RETAIL,SUPPLIES_TO,0.6,POS yazılımları`}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              sx={{ fontFamily: 'monospace' }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={importUpsert}
                  onChange={(e) => setImportUpsert(e.target.checked)}
                />
              }
              label="Var olanları güncelle (upsert)"
            />
            {importResult && (
              <Alert severity={importResult.errors.length > 0 ? 'warning' : 'success'}>
                Tamam — eklendi: <b>{importResult.created}</b>,
                güncellendi: <b>{importResult.updated}</b>,
                atlandı: <b>{importResult.skipped}</b>
                {importResult.errors.length > 0 && (
                  <>
                    <br />
                    Hatalar ({importResult.errors.length}):
                    <ul style={{ margin: '4px 0 0 0', paddingLeft: 20 }}>
                      {importResult.errors.slice(0, 10).map((e, i) => (
                        <li key={i}>
                          <code>{e}</code>
                        </li>
                      ))}
                      {importResult.errors.length > 10 && <li>...ve dahası</li>}
                    </ul>
                  </>
                )}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportOpen(false)}>Kapat</Button>
          <Button
            variant="contained"
            disabled={submitting || !importText.trim()}
            onClick={async () => {
              setSubmitting(true);
              setImportResult(null);
              try {
                const edges = parseCsv(importText);
                if (edges.length === 0) {
                  setError('Geçerli kayıt bulunamadı — formatı kontrol edin.');
                  return;
                }
                const result = await nbAdminService.bulkImportValueChain({
                  edges,
                  upsert: importUpsert,
                });
                setImportResult(result);
                await load();
              } catch (e: any) {
                setError(e?.message ?? 'İçe aktarma başarısız');
              } finally {
                setSubmitting(false);
              }
            }}
          >
            İçe Aktar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/**
 * CSV satırlarını ValueChainEdgeCreate listesine çevirir.
 * Sütun sırası: sourceSector, targetSector, direction, weight, notes
 * Header satırı (sourceSector kelimesini içerirse) atlanır.
 * Boş satırlar ve # ile başlayan yorum satırları atlanır.
 */
function parseCsv(text: string): ValueChainEdgeCreate[] {
  const out: ValueChainEdgeCreate[] = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    if (t.toLowerCase().includes('sourcesector')) continue;
    const cols = t.split(',').map((c) => c.trim());
    if (cols.length < 4) continue;
    const weight = parseFloat(cols[3]);
    if (Number.isNaN(weight)) continue;
    out.push({
      sourceSector: cols[0],
      targetSector: cols[1],
      direction: cols[2] as ChainDirection,
      weight,
      notes: cols[4] || undefined,
    });
  }
  return out;
}
