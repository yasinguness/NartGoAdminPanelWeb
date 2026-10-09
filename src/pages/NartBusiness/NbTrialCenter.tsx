/**
 * Deneme Merkezi — denemedeki her üyeye deneme bitmeden somut bir fayda
 * ulaştırmanın günlük ekranı.
 *
 * Hedef (analiz, 7 Ekim 2026): her deneme üyesine bitişten en az 10 gün önce
 * dört değerden en az ikisi ulaşmalı — 3 uygun ihale, 1 tanıştırma, 1 alım
 * talebi, profil görünürlüğü. Satırdaki işaretler bunu gösterir; segment
 * deneme sonunda ne yapılacağını belirler (ödeme teklifi / uzatma / telefon).
 *
 * WhatsApp mesajını panel göndermez: metni hazırlar ve wa.me bağlantısını
 * açar, gönderimi insan yapar. Görüşme sonrası not buraya yazılır.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Drawer,
  IconButton,
  Link,
  MenuItem,
  Select,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import {
  NB_SEGMENT_LABEL,
  NB_SEGMENT_PLAY,
  nbOpsService,
  type NbNote,
  type NbSuccessSegment,
  type NbTrialRow,
} from '../../services/nartbusiness/nbOpsService';
import { nbAdminService } from '../../services/nartbusiness/nbAdminService';
import { nbWhatsAppLink } from '../../services/nartbusiness/nbPhone';
import { nbErrorMessage } from '../../services/nartbusiness/nbErrorMessage';
import { relativeDate } from '../../utils/nbDisplay';
import {
  NbFilterBar,
  NbKpi,
  NbPageHeader,
  NbUndoToast,
  nbCard,
  nbDividerLine,
  nbGrid,
  nbHeadRow,
  nbPill,
  type NbUndoState,
} from '../../components/nartbusiness/ui';
import { NbValueSignals, NbValueSummaryView } from '../../components/nartbusiness/NbMemberValueCard';
import NbMemberNotesPanel from '../../components/nartbusiness/NbMemberNotesPanel';
import NbMemberOpportunities from '../../components/nartbusiness/NbMemberOpportunities';
import { nb } from '../../theme/nbBrand';

const ROW_GRID = 'minmax(0,1.8fr) 92px 96px minmax(0,1.5fr) 150px minmax(0,1.6fr) 132px';

type FilterKey = 'week' | 'lowValue' | 'silent' | 'tasks' | 'never' | 'ended';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'week', label: 'Bu hafta bitiyor' },
  { key: 'lowValue', label: 'Göstergesi 2’nin altında' },
  { key: 'never', label: 'Hiç giriş yapmadı' },
  { key: 'silent', label: 'Sessiz' },
  { key: 'tasks', label: 'Açık görev' },
  { key: 'ended', label: 'Deneme bitti' },
];

const SEGMENTS: NbSuccessSegment[] = ['VALUE_SEEN', 'ENGAGED_NO_RESULT', 'SILENT'];

function fmtDay(iso?: string | null) {
  return iso ? new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' }) : '—';
}

function segmentTone(s?: NbSuccessSegment | null) {
  if (s === 'VALUE_SEEN') return 'good' as const;
  if (s === 'ENGAGED_NO_RESULT') return 'warn' as const;
  if (s === 'SILENT') return 'bad' as const;
  return 'neutral' as const;
}

/** Duruma göre hazır WhatsApp metni — admin göndermeden önce düzenler. */
function whatsappText(r: NbTrialRow) {
  const greeting = r.companyName ? `Sayın ${r.companyName} yetkilisi,` : 'Merhaba,';
  const v = r.value;
  if (r.status !== 'TRIAL') {
    const parts = [
      v && v.tendersReferred > 0 ? `${v.tendersReferred} ihale` : null,
      v && v.introductions > 0 ? `${v.introductions} tanıştırma` : null,
    ].filter(Boolean);
    return (
      `${greeting}\n\nNartBusiness deneme döneminiz ${fmtDay(r.trialEndsAt)} tarihinde sona ermiştir.` +
      (parts.length ? ` Bu süreçte firmanıza ${parts.join(' ve ')} iletilmiştir.` : '') +
      ' Üyeliğinizi aylık veya yıllık seçeneklerle sürdürmek isterseniz memnuniyetle yardımcı oluruz.\n\nSaygılarımızla,\nNartBusiness'
    );
  }
  return (
    `${greeting}\n\nNartBusiness deneme döneminizin sona ermesine ${Math.max(0, r.daysLeft ?? 0)} gün kalmıştır. ` +
    'Faaliyet alanınıza uygun ihaleleri ve iş birliği önerilerimizi birlikte değerlendirmek üzere kısa bir görüşme planlamak isteriz. Size uygun bir zamanı paylaşabilir misiniz?\n\nSaygılarımızla,\nNartBusiness'
  );
}

export default function NbTrialCenter() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<NbTrialRow[]>([]);
  const [activityOk, setActivityOk] = useState(true);
  const [tasks, setTasks] = useState<NbNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey | null>(null);
  const [search, setSearch] = useState('');
  const [drawer, setDrawer] = useState<NbTrialRow | null>(null);
  const [undo, setUndo] = useState<NbUndoState | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [center, today] = await Promise.all([nbOpsService.trialCenter(), nbOpsService.tasks('today')]);
      setRows(center.rows);
      setActivityOk(center.activityDataAvailable);
      setTasks(today);
      setError(null);
    } catch (e) {
      setError(nbErrorMessage(e, 'Deneme takibi yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const effectiveSegment = (r: NbTrialRow) => r.segment ?? r.suggestedSegment ?? null;

  const counts = useMemo(
    () => ({
      trial: rows.filter((r) => r.status === 'TRIAL').length,
      week: rows.filter((r) => r.status === 'TRIAL' && r.daysLeft != null && r.daysLeft <= 7).length,
      lowValue: rows.filter((r) => (r.value?.valueSignals ?? 0) < 2).length,
      ended: rows.filter((r) => r.status !== 'TRIAL').length,
      never: rows.filter((r) => r.neverOpened === true).length,
    }),
    [rows],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('tr');
    return rows.filter((r) => {
      if (q && !(r.companyName ?? '').toLocaleLowerCase('tr').includes(q) && !(r.city ?? '').toLocaleLowerCase('tr').includes(q)) {
        return false;
      }
      switch (filter) {
        case 'week':
          return r.status === 'TRIAL' && r.daysLeft != null && r.daysLeft <= 7;
        case 'lowValue':
          return (r.value?.valueSignals ?? 0) < 2;
        case 'never':
          return r.neverOpened === true;
        case 'silent':
          return effectiveSegment(r) === 'SILENT';
        case 'tasks':
          return r.openTasks > 0;
        case 'ended':
          return r.status !== 'TRIAL';
        default:
          return true;
      }
    });
  }, [rows, filter, search]);

  const setSegment = async (r: NbTrialRow, segment: NbSuccessSegment | null) => {
    try {
      await nbOpsService.setSegment(r.memberId, segment);
      setUndo({
        message: `${r.companyName ?? 'Üye'}: ${segment ? NB_SEGMENT_LABEL[segment] : 'sistem önerisi kullanılıyor'}`,
        onUndo: async () => {
          await nbOpsService.setSegment(r.memberId, r.segment ?? null);
          await load();
        },
      });
      await load();
    } catch (e) {
      setError(nbErrorMessage(e, 'Segment kaydedilemedi.'));
    }
  };

  const extend = async (r: NbTrialRow) => {
    if (!window.confirm(`${r.companyName ?? 'Üye'} için deneme süresi 7 gün uzatılsın mı?`)) return;
    try {
      await nbAdminService.extendTrial(r.memberId, 7);
      setUndo({ message: `${r.companyName ?? 'Üye'}: deneme süresi 7 gün uzatıldı` });
      await load();
    } catch (e) {
      setError(nbErrorMessage(e, 'Deneme uzatılamadı.'));
    }
  };

  const closeTask = async (t: NbNote) => {
    try {
      await nbOpsService.updateNote(t.id, { done: true });
      setUndo({
        message: 'Görev tamamlandı',
        onUndo: async () => {
          await nbOpsService.updateNote(t.id, { done: false });
          await load();
        },
      });
      await load();
    } catch (e) {
      setError(nbErrorMessage(e, 'Görev kapatılamadı.'));
    }
  };

  return (
    <Box>
      <NbPageHeader
        crumb="NartBusiness · Üyelik"
        title="Deneme Merkezi"
        subtitle="Deneme süresi bitmeden her üyeye en az iki hizmet göstergesinin ulaşması hedeflenir: 3 ihale, 1 tanıştırma, 1 alım talebi ve profil ilgisi."
        kpis={
          <>
            <NbKpi label="DENEMEDE" value={counts.trial} />
            <NbKpi
              label="BU HAFTA BİTİYOR"
              value={counts.week}
              tone="warn"
              active={filter === 'week'}
              onClick={() => setFilter((f) => (f === 'week' ? null : 'week'))}
            />
            <NbKpi
              label="GÖSTERGESİ 2’NİN ALTINDA"
              value={counts.lowValue}
              hint="dört göstergeden"
              tone="bad"
              active={filter === 'lowValue'}
              onClick={() => setFilter((f) => (f === 'lowValue' ? null : 'lowValue'))}
            />
            <NbKpi label="BUGÜNKÜ GÖREVLER" value={tasks.length} tone={tasks.length ? 'warn' : 'neutral'} />
            <NbKpi
              label="DENEME BİTTİ"
              value={counts.ended}
              hint="ödeme bekleniyor"
              active={filter === 'ended'}
              onClick={() => setFilter((f) => (f === 'ended' ? null : 'ended'))}
            />
          </>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {!activityOk && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Son giriş bilgisi şu an alınamıyor; "Hiç giriş yapmadı" filtresi ve "Pasif" önerisi eksik görünebilir.
        </Alert>
      )}

      {/* ── Bugünkü görevler ─────────────────────────────────────────── */}
      <Box sx={{ ...(nbCard as object), p: 2, mb: 1.75 }}>
        <Typography sx={{ fontSize: 10, letterSpacing: '0.12em', color: nb.textFaint, fontWeight: 600, mb: 1 }}>
          BUGÜNKÜ GÖREVLER ({tasks.length})
        </Typography>
        {tasks.length === 0 && (
          <Typography sx={{ fontSize: 12.5, color: nb.textFaint }}>Bugün için açık görev yok.</Typography>
        )}
        {tasks.slice(0, 12).map((t) => {
          const overdue = t.dueAt && new Date(t.dueAt).getTime() < Date.now();
          const row = rows.find((r) => r.memberId === t.memberId);
          return (
            <Stack key={t.id} direction="row" alignItems="flex-start" spacing={0.75} sx={{ py: 0.5 }}>
              <Checkbox size="small" checked={false} onChange={() => closeTask(t)} sx={{ p: 0.5 }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 12.5, lineHeight: 1.45 }}>
                  <Link
                    component="button"
                    underline="hover"
                    sx={{ fontWeight: 600, fontSize: 12.5, mr: 0.75 }}
                    onClick={() => (row ? setDrawer(row) : navigate(`/nartbusiness/members/${t.memberId}`))}
                  >
                    {t.memberName || 'Üye'}
                  </Link>
                  {t.body}
                </Typography>
                <Typography sx={{ fontSize: 10.5, color: overdue ? nb.red : nb.textFaint }}>
                  {t.dueAt ? `vade ${fmtDay(t.dueAt)}${overdue ? ' · gecikti' : ''}` : 'vadesiz'}
                  {t.auto ? ' · otomatik' : ''}
                </Typography>
              </Box>
            </Stack>
          );
        })}
        {tasks.length > 12 && (
          <Typography sx={{ fontSize: 11.5, color: nb.textFaint, mt: 0.5 }}>+{tasks.length - 12} görev daha</Typography>
        )}
      </Box>

      {/* ── Üyeler ───────────────────────────────────────────────────── */}
      <Box sx={{ ...(nbCard as object), overflow: 'hidden' }}>
        <NbFilterBar
          search={search}
          onSearch={setSearch}
          placeholder="Firma ya da il…"
          chips={FILTERS.map((f) => ({
            key: f.key,
            label: f.label,
            active: filter === f.key,
            onToggle: () => setFilter((prev) => (prev === f.key ? null : f.key)),
          }))}
          trailing={<Typography sx={{ fontSize: 11.5, color: nb.textFaint }}>{visible.length} üye</Typography>}
        />

        <Box sx={nbHeadRow(ROW_GRID)}>
          <Box>ÜYE</Box>
          <Box>BİTİŞ</Box>
          <Box>SON GİRİŞ</Box>
          <Box>HİZMET GÖSTERGELERİ</Box>
          <Box>SEGMENT</Box>
          <Box>SIRADAKİ GÖREV</Box>
          <Box />
        </Box>

        {loading && rows.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress size={24} />
          </Box>
        ) : visible.length === 0 ? (
          <Typography sx={{ fontSize: 12.5, color: nb.textFaint, p: 3 }}>Bu filtreye uyan üye bulunmuyor.</Typography>
        ) : (
          visible.map((r) => {
            const seg = effectiveSegment(r);
            const wa = nbWhatsAppLink(r.phone, whatsappText(r));
            const urgent = r.status === 'TRIAL' && r.daysLeft != null && r.daysLeft <= 7;
            return (
              <Box key={r.memberId} sx={{ ...(nbGrid(ROW_GRID) as object), px: 2, py: 1.25, borderBottom: nbDividerLine }}>
                <Box sx={{ minWidth: 0 }}>
                  <Link
                    component="button"
                    underline="hover"
                    onClick={() => setDrawer(r)}
                    sx={{ fontSize: 12.5, fontWeight: 600, textAlign: 'left', color: nb.text }}
                  >
                    {r.companyName || 'Firma adı girilmemiş'}
                  </Link>
                  <Typography sx={{ fontSize: 11, color: nb.textFaint }} noWrap>
                    {[r.city, r.tier].filter(Boolean).join(' · ')}
                  </Typography>
                </Box>

                <Box>
                  {r.status === 'TRIAL' ? (
                    <>
                      <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: urgent ? nb.red : nb.text }}>
                        {r.daysLeft != null ? `${Math.max(0, r.daysLeft)} gün` : '—'}
                      </Typography>
                      <Typography sx={{ fontSize: 10.5, color: nb.textFaint }}>{fmtDay(r.trialEndsAt)}</Typography>
                    </>
                  ) : (
                    <Box sx={nbPill('warn')}>bitti {fmtDay(r.trialEndsAt)}</Box>
                  )}
                </Box>

                <Typography sx={{ fontSize: 12, color: r.neverOpened ? nb.red : nb.textMuted }}>
                  {r.neverOpened ? 'giriş yapmadı' : r.lastActiveAt ? relativeDate(r.lastActiveAt) : '—'}
                </Typography>

                <NbValueSignals value={r.value} />

                <Box>
                  <Select
                    size="small"
                    value={r.segment ?? ''}
                    displayEmpty
                    onChange={(e) => setSegment(r, (e.target.value || null) as NbSuccessSegment | null)}
                    sx={{ fontSize: 12, minWidth: 140, '& .MuiSelect-select': { py: 0.5 } }}
                    renderValue={() =>
                      seg ? (
                        <Box component="span" sx={nbPill(segmentTone(seg))}>
                          {NB_SEGMENT_LABEL[seg]}
                          {!r.segment ? ' (sistem önerisi)' : ''}
                        </Box>
                      ) : (
                        <Box component="span" sx={{ color: nb.textFaint }}>Seçiniz</Box>
                      )
                    }
                  >
                    <MenuItem value="">
                      <em>Sistem önerisini kullan</em>
                    </MenuItem>
                    {SEGMENTS.map((s) => (
                      <MenuItem key={s} value={s}>
                        <Box>
                          <Typography sx={{ fontSize: 12.5 }}>{NB_SEGMENT_LABEL[s]}</Typography>
                          <Typography sx={{ fontSize: 11, color: nb.textFaint }}>{NB_SEGMENT_PLAY[s]}</Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </Box>

                <Box sx={{ minWidth: 0 }}>
                  {r.nextTask ? (
                    <Tooltip title={r.nextTask.body}>
                      <Typography sx={{ fontSize: 12, lineHeight: 1.4 }} noWrap>
                        {r.nextTask.body}
                      </Typography>
                    </Tooltip>
                  ) : (
                    <Typography sx={{ fontSize: 12, color: nb.textFaint }}>—</Typography>
                  )}
                  <Typography sx={{ fontSize: 10.5, color: nb.textFaint }} noWrap>
                    {r.openTasks > 1 ? `+${r.openTasks - 1} görev · ` : ''}
                    {r.lastNote ? `son not ${relativeDate(r.lastNote.createdAt)}` : 'not bulunmuyor'}
                  </Typography>
                </Box>

                <Stack direction="row" spacing={0.25} justifyContent="flex-end">
                  <Tooltip title={wa ? 'WhatsApp mesajını aç' : 'Kayıtlı telefon yok'}>
                    <span>
                      <IconButton size="small" disabled={!wa} component="a" href={wa ?? undefined} target="_blank" rel="noopener">
                        <WhatsAppIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Button size="small" onClick={() => setDrawer(r)} sx={{ minWidth: 0, fontSize: 11.5 }}>
                    Not
                  </Button>
                  {r.status === 'TRIAL' && (
                    <Button size="small" onClick={() => extend(r)} sx={{ minWidth: 0, fontSize: 11.5 }}>
                      +7 gün
                    </Button>
                  )}
                </Stack>
              </Box>
            );
          })
        )}
      </Box>

      {/* ── Üye çekmecesi: sonuç kartı + notlar ──────────────────────── */}
      <Drawer anchor="right" open={!!drawer} onClose={() => setDrawer(null)}>
        {drawer && (
          <Box sx={{ width: { xs: '100vw', sm: 520 }, p: 2.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
              <Box>
                <Typography sx={{ fontSize: 16, fontWeight: 600 }}>{drawer.companyName || 'Üye'}</Typography>
                <Typography sx={{ fontSize: 11.5, color: nb.textFaint }}>
                  {drawer.status === 'TRIAL'
                    ? `Deneme ${fmtDay(drawer.trialEndsAt)} tarihinde bitiyor`
                    : `Deneme ${fmtDay(drawer.trialEndsAt)} tarihinde bitti`}
                </Typography>
              </Box>
              <IconButton onClick={() => setDrawer(null)}>
                <CloseIcon />
              </IconButton>
            </Stack>

            <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', rowGap: 1 }}>
              <Button size="small" variant="outlined" onClick={() => navigate(`/nartbusiness/members/${drawer.memberId}?tab=introductions`)}>
                Tanıştır
              </Button>
              <Button size="small" variant="outlined" onClick={() => navigate(`/nartbusiness/weekly-shortlist?memberId=${drawer.memberId}`)}>
                İhale kısa listesi
              </Button>
              <Button size="small" variant="outlined" onClick={() => navigate(`/nartbusiness/members/${drawer.memberId}`)}>
                Üye detayı
              </Button>
            </Stack>

            {drawer.value && (
              <Box sx={{ mb: 2.5 }}>
                <NbValueSummaryView value={drawer.value} />
              </Box>
            )}

            <NbMemberNotesPanel memberId={drawer.memberId} onChanged={load} />

            <Box sx={{ mt: 3 }}>
              <NbMemberOpportunities
                memberId={drawer.memberId}
                companyName={drawer.companyName}
                phone={drawer.phone}
                // Tanıştırma çekmecesi üye detayında; öneri orada seçili açılır.
                onIntroduce={() => navigate(`/nartbusiness/members/${drawer.memberId}?tab=opportunities`)}
                onToast={(message) => {
                  setUndo({ message });
                  void load();
                }}
              />
            </Box>
          </Box>
        )}
      </Drawer>

      <NbUndoToast state={undo} onClose={() => setUndo(null)} />
    </Box>
  );
}
