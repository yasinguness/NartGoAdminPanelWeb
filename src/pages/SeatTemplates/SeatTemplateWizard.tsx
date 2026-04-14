import React, { useState, useCallback, useMemo } from 'react';
import {
  Box, Typography, Button, Stepper, Step, StepLabel, Paper, TextField,
  IconButton, Chip, CircularProgress, alpha, useTheme,
  Divider, Stack, Select, MenuItem, FormControl, InputLabel,
  Dialog, DialogContent, Tooltip,
} from '@mui/material';
import {
  CloudUpload as UploadIcon, Add as AddIcon, Delete as DeleteIcon,
  Edit as EditIcon, Check as CheckIcon, ArrowBack as BackIcon,
  ArrowForward as NextIcon, Save as SaveIcon, EventSeat as SeatIcon,
  ColorLens as ColorIcon, Fullscreen as FullscreenIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import {
  seatTemplateService, SeatTemplateRow, SeatTemplateCategory,
} from '../../services/ticket/seatTemplateService';

const STEPS = ['Dosya Yükle', 'Önizleme & Düzenleme', 'Kategori Tanımla'];

/** Genişletilmiş Türkçe alfabe — Q, W, X dahil. Sıra isimleri bu listeden atanır. */
const TR_ALPHABET = [
  'A', 'B', 'C', 'Ç', 'D', 'E', 'F', 'G', 'Ğ', 'H',
  'I', 'İ', 'J', 'K', 'L', 'M', 'N', 'O', 'Ö', 'P',
  'Q', 'R', 'S', 'Ş', 'T', 'U', 'Ü', 'V', 'W', 'X',
  'Y', 'Z',
];

/** Kullanılmayan bir sonraki harfi bul */
function getNextAvailableLetter(usedNames: string[]): string {
  const usedSet = new Set(usedNames.map(n => n.toUpperCase()));
  for (const letter of TR_ALPHABET) {
    if (!usedSet.has(letter)) return letter;
  }
  // Tüm harfler tükendiyse AA, AB... devam et
  for (let i = 1; i <= 99; i++) {
    const name = `${TR_ALPHABET[i % TR_ALPHABET.length]}${i}`;
    if (!usedSet.has(name)) return name;
  }
  return `S${usedNames.length + 1}`;
}

/** Alfabe sırasındaki bir sonraki harfi bul (son sıradan sonra gelen) */
function getNextLetterAfter(lastRowName: string, usedNames: string[]): string {
  const usedSet = new Set(usedNames.map(n => n.toUpperCase()));
  const upper = lastRowName.toUpperCase();
  const idx = TR_ALPHABET.indexOf(upper);

  // Son sıra alfabede bulunuyorsa, ondan sonraki ilk kullanılmayan harfi ver
  if (idx >= 0) {
    for (let i = idx + 1; i < TR_ALPHABET.length; i++) {
      if (!usedSet.has(TR_ALPHABET[i])) return TR_ALPHABET[i];
    }
  }

  // Bulunamadıysa genel fallback
  return getNextAvailableLetter(usedNames);
}

const DEFAULT_COLORS = [
  '#FFD700', '#4CAF50', '#2196F3', '#FF5722', '#9C27B0',
  '#00BCD4', '#FF9800', '#E91E63', '#607D8B', '#795548',
];

export default function SeatTemplateWizard() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Step 1 - File upload
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Step 2 - Row editing
  const [rows, setRows] = useState<SeatTemplateRow[]>([]);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [confidence, setConfidence] = useState(0);

  // Step 2 - Stage position
  type StagePosition = 'bottom' | 'top';
  const [stagePosition, setStagePosition] = useState<StagePosition>('bottom');

  // Step 3 - Categories
  const [categories, setCategories] = useState<SeatTemplateCategory[]>([]);
  const [templateName, setTemplateName] = useState('');

  const totalSeats = useMemo(() => rows.reduce((sum, r) => sum + r.seatCount, 0), [rows]);

  // ── Step 1: File Upload ──────────────────────────────────

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  }, []);

  const handleParse = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const res = await seatTemplateService.parseFile(file);
      if (res.success && res.data) {
        setRows(res.data.rows);
        setConfidence(res.data.confidence);
        setActiveStep(1);
        enqueueSnackbar(`${res.data.totalSeats} koltuk tespit edildi`, { variant: 'success' });
      } else {
        enqueueSnackbar(res.message || 'Analiz başarısız', { variant: 'error' });
      }
    } catch (e: any) {
      enqueueSnackbar(e?.response?.data?.message || 'Dosya analiz hatası', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Row Editing ──────────────────────────────────

  const updateRow = (index: number, field: keyof SeatTemplateRow, value: string | number) => {
    setRows(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  };

  const addRow = () => {
    const usedNames = rows.map(r => r.name);
    const lastRow = rows[rows.length - 1];
    const nextName = lastRow
      ? getNextLetterAfter(lastRow.name, usedNames)
      : getNextAvailableLetter(usedNames);
    setRows(prev => [...prev, { name: nextName, seatCount: lastRow?.seatCount || 22 }]);
  };

  const removeRow = (index: number) => {
    setRows(prev => prev.filter((_, i) => i !== index));
  };

  // ── Step 3: Category Assignment (sıra aralığı bazlı) ───────

  /** Sıra isimlerinin listesi (parse'dan gelen sıraya göre) */
  const rowNames = useMemo(() => rows.map(r => r.name), [rows]);

  /** Sıra aralığından sıra listesi oluştur */
  const getRowsInRange = useCallback((fromRow: string, toRow: string): string[] => {
    const fromIdx = rowNames.indexOf(fromRow);
    const toIdx = rowNames.indexOf(toRow);
    if (fromIdx < 0 || toIdx < 0) return [];
    const start = Math.min(fromIdx, toIdx);
    const end = Math.max(fromIdx, toIdx);
    return rowNames.slice(start, end + 1);
  }, [rowNames]);

  const addCategory = () => {
    const colorIndex = categories.length % DEFAULT_COLORS.length;
    // Kategorilere atanmamış ilk sırayı bul
    const assignedRows = new Set(categories.flatMap(c => c.rows));
    const firstUnassigned = rowNames.find(r => !assignedRows.has(r)) || rowNames[0] || '';
    const lastUnassigned = rowNames.filter(r => !assignedRows.has(r)).pop() || firstUnassigned;

    setCategories(prev => [
      ...prev,
      {
        name: `Kategori ${prev.length + 1}`,
        rows: getRowsInRange(firstUnassigned, lastUnassigned),
        color: DEFAULT_COLORS[colorIndex],
      },
    ]);
  };

  /** Sıra aralığı değiştiğinde kategori rows'unu güncelle */
  const updateCategoryRange = (catIndex: number, fromRow: string, toRow: string) => {
    const newRows = getRowsInRange(fromRow, toRow);
    setCategories(prev => prev.map((c, i) => i === catIndex ? { ...c, rows: newRows } : c));
  };

  const updateCategory = (index: number, field: keyof SeatTemplateCategory, value: any) => {
    setCategories(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c));
  };

  const removeCategory = (index: number) => {
    setCategories(prev => prev.filter((_, i) => i !== index));
  };

  // Bir sıranın hangi kategoride olduğunu bul
  const getRowCategory = (rowName: string): number => {
    return categories.findIndex(c => c.rows.includes(rowName));
  };

  /** Kategori için from/to sıra bilgisini hesapla */
  const getCategoryRange = (cat: SeatTemplateCategory): { from: string; to: string } => {
    if (!cat.rows.length) return { from: rowNames[0] || '', to: rowNames[0] || '' };
    // rows'daki sıraları rowNames sırasına göre sırala
    const sorted = [...cat.rows].sort((a, b) => rowNames.indexOf(a) - rowNames.indexOf(b));
    return { from: sorted[0], to: sorted[sorted.length - 1] };
  };

  // ── Save ──────────────────────────────────────────────────

  const handleSave = async () => {
    if (!templateName.trim()) {
      enqueueSnackbar('Şablon adı zorunludur', { variant: 'warning' });
      return;
    }

    setSaving(true);
    try {
      const res = await seatTemplateService.saveTemplate({
        name: templateName,
        rows,
        categories: categories.length > 0 ? categories : undefined,
        stagePosition,
      });
      if (res.success) {
        enqueueSnackbar(`"${templateName}" şablonu kaydedildi (${totalSeats} koltuk)`, { variant: 'success' });
        navigate('/seat-templates');
      } else {
        enqueueSnackbar(res.message || 'Kaydetme hatası', { variant: 'error' });
      }
    } catch (e: any) {
      enqueueSnackbar(e?.response?.data?.message || 'Kaydetme hatası', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // ── Seat Preview (kuşbakışı) ──────────────────────────────

  // ── Fullscreen preview state ──
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  /** Salon grid'ini render et — hem küçük hem fullscreen'de kullanılır */
  const renderSeatGrid = (fullscreen: boolean) => {
    const maxSeats = Math.max(...rows.map(r => r.seatCount), 1);
    const seatW = fullscreen
      ? Math.max(14, Math.min(28, 900 / maxSeats))
      : Math.max(8, Math.min(18, 500 / maxSeats));
    const gap = fullscreen ? '3px' : '2px';
    const rowGap = fullscreen ? 1 : 0.5;
    const labelW = fullscreen ? 44 : 30;
    const labelFs = fullscreen ? 13 : 10;
    const countFs = fullscreen ? 12 : 10;

    const displayRows = stagePosition === 'bottom' ? [...rows].reverse() : rows;

    const StageBanner = (
      <Box sx={{
        my: fullscreen ? 2.5 : 1.5,
        mx: 'auto',
        width: fullscreen ? '60%' : '50%',
        py: fullscreen ? 1.2 : 0.5,
        bgcolor: alpha(theme.palette.warning.main, 0.25),
        border: '2px solid',
        borderColor: alpha(theme.palette.warning.main, 0.6),
        borderRadius: fullscreen ? 2 : 1,
        textAlign: 'center',
      }}>
        <Typography
          variant={fullscreen ? 'subtitle1' : 'caption'}
          fontWeight={800}
          color="warning.dark"
          letterSpacing={fullscreen ? 4 : 1}
        >
          SAHNE
        </Typography>
      </Box>
    );

    return (
      <>
        {stagePosition === 'top' && StageBanner}

        {displayRows.map((row) => {
          const catIdx = getRowCategory(row.name);
          const color = catIdx >= 0 ? categories[catIdx].color : theme.palette.primary.main;

          return (
            <Box key={row.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: rowGap }}>
              <Typography sx={{
                width: labelW, textAlign: 'right', fontWeight: 700,
                fontSize: labelFs, color: 'text.secondary', fontFamily: 'monospace',
              }}>
                {row.name}
              </Typography>
              <Box sx={{ display: 'flex', gap, justifyContent: 'center', flex: 1 }}>
                {Array.from({ length: row.seatCount }).map((_, i) => (
                  <Tooltip
                    key={i}
                    title={fullscreen ? `${row.name}-${i + 1}` : ''}
                    arrow
                    placement="top"
                    disableHoverListener={!fullscreen}
                  >
                    <Box sx={{
                      width: seatW, height: seatW,
                      borderRadius: fullscreen ? '3px' : '2px',
                      bgcolor: alpha(color, 0.55),
                      border: '1px solid',
                      borderColor: alpha(color, 0.8),
                      transition: 'transform 0.1s',
                      ...(fullscreen && {
                        '&:hover': { transform: 'scale(1.3)', bgcolor: color, zIndex: 1 },
                        cursor: 'pointer',
                      }),
                    }} />
                  </Tooltip>
                ))}
              </Box>
              <Typography sx={{ width: labelW, fontSize: countFs, color: 'text.disabled', fontFamily: 'monospace' }}>
                {row.seatCount}
              </Typography>
            </Box>
          );
        })}

        {stagePosition === 'bottom' && StageBanner}
      </>
    );
  };

  /** Küçük sidebar preview + tam ekran butonu */
  const SeatPreview = () => (
    <Box sx={{
      p: 2, borderRadius: 2,
      border: '1px solid', borderColor: 'divider',
      bgcolor: alpha(theme.palette.background.default, 0.5),
      overflow: 'auto',
    }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {totalSeats} koltuk · {rows.length} sıra
        </Typography>
        <Tooltip title="Tam ekran önizleme">
          <IconButton size="small" onClick={() => setFullscreenOpen(true)} color="primary">
            <FullscreenIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* Sahne yönü seçici */}
      <Stack direction="row" spacing={0.5} justifyContent="center" sx={{ mb: 1.5 }}>
        <Chip
          label={`${rows[0]?.name || 'A'} sahneye yakın`}
          size="small"
          variant={stagePosition === 'bottom' ? 'filled' : 'outlined'}
          color={stagePosition === 'bottom' ? 'warning' : 'default'}
          onClick={() => setStagePosition('bottom')}
          sx={{ cursor: 'pointer', fontWeight: stagePosition === 'bottom' ? 700 : 400, fontSize: 11 }}
        />
        <Chip
          label={`${rows[rows.length - 1]?.name || 'Z'} sahneye yakın`}
          size="small"
          variant={stagePosition === 'top' ? 'filled' : 'outlined'}
          color={stagePosition === 'top' ? 'warning' : 'default'}
          onClick={() => setStagePosition('top')}
          sx={{ cursor: 'pointer', fontWeight: stagePosition === 'top' ? 700 : 400, fontSize: 11 }}
        />
      </Stack>

      {renderSeatGrid(false)}
    </Box>
  );

  /** Tam ekran dialog */
  const FullscreenPreviewDialog = () => (
    <Dialog
      open={fullscreenOpen}
      onClose={() => setFullscreenOpen(false)}
      fullScreen
      PaperProps={{ sx: { bgcolor: 'background.default' } }}
    >
      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '100vh' }}>
        {/* Toolbar */}
        <Box sx={{
          px: 3, py: 1.5,
          borderBottom: '1px solid', borderColor: 'divider',
          bgcolor: 'background.paper',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0,
        }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <SeatIcon color="primary" />
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>
                {templateName || 'Salon Planı Önizleme'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {rows.length} sıra · {totalSeats} koltuk
                {categories.length > 0 && ` · ${categories.length} kategori`}
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            {/* Sahne yönü */}
            <Chip
              label={`${rows[0]?.name || 'A'} sahneye yakın`}
              size="small"
              variant={stagePosition === 'bottom' ? 'filled' : 'outlined'}
              color={stagePosition === 'bottom' ? 'warning' : 'default'}
              onClick={() => setStagePosition('bottom')}
              sx={{ cursor: 'pointer', fontWeight: stagePosition === 'bottom' ? 700 : 400 }}
            />
            <Chip
              label={`${rows[rows.length - 1]?.name || 'Z'} sahneye yakın`}
              size="small"
              variant={stagePosition === 'top' ? 'filled' : 'outlined'}
              color={stagePosition === 'top' ? 'warning' : 'default'}
              onClick={() => setStagePosition('top')}
              sx={{ cursor: 'pointer', fontWeight: stagePosition === 'top' ? 700 : 400 }}
            />

            {/* Kategori legend */}
            {categories.map((cat) => (
              <Chip
                key={cat.name}
                size="small"
                label={`${cat.name} (${cat.rows.length} sıra)`}
                sx={{
                  bgcolor: alpha(cat.color, 0.2),
                  borderColor: cat.color,
                  fontWeight: 600,
                  fontSize: 11,
                }}
                variant="outlined"
                icon={<Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: cat.color, ml: 1 }} />}
              />
            ))}

            <IconButton onClick={() => setFullscreenOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </Box>

        {/* Seat grid — scrollable, centered */}
        <Box sx={{
          flex: 1, overflow: 'auto',
          display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
          p: 4,
        }}>
          <Box sx={{ minWidth: 600, maxWidth: 1100 }}>
            {renderSeatGrid(true)}
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );

  // ── Render Steps ──────────────────────────────────────────

  const renderStep0 = () => (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Box
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        sx={{
          border: '2px dashed',
          borderColor: dragOver ? 'primary.main' : 'divider',
          borderRadius: 3,
          p: 6,
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s',
          bgcolor: dragOver ? alpha(theme.palette.primary.main, 0.05) : 'transparent',
          '&:hover': { borderColor: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.02) },
        }}
        onClick={() => document.getElementById('file-upload')?.click()}
      >
        <input
          id="file-upload"
          type="file"
          accept=".pdf"
          hidden
          onChange={handleFileSelect}
        />
        <UploadIcon sx={{ fontSize: 56, color: dragOver ? 'primary.main' : 'text.disabled', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          {file ? file.name : 'PDF dosyasını sürükleyin'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          veya dosya seçmek için tıklayın
        </Typography>
        <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block' }}>
          Salon planını PDF formatında yükleyin. Koltuk numaraları (A-1, B-22 gibi) otomatik okunur.
        </Typography>
        {file && (
          <Chip
            label={`${(file.size / 1024).toFixed(0)} KB — ${file.type}`}
            sx={{ mt: 2 }}
            onDelete={() => setFile(null)}
          />
        )}
      </Box>

      <Box sx={{ textAlign: 'center', mt: 3 }}>
        <Button
          variant="contained"
          size="large"
          onClick={handleParse}
          disabled={!file || loading}
          startIcon={loading ? <CircularProgress size={20} /> : <SeatIcon />}
          sx={{ borderRadius: 2, px: 4 }}
        >
          {loading ? 'Plan analiz ediliyor...' : 'Analiz Et'}
        </Button>
      </Box>
    </Box>
  );

  const renderStep1 = () => (
    <Box sx={{ display: 'flex', gap: 3, mt: 2 }}>
      {/* Sol: Sıra listesi */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            Sıra Düzeni ({rows.length} sıra, {totalSeats} koltuk)
          </Typography>
          {confidence > 0 && (
            <Chip
              label={`Güven: %${Math.round(confidence * 100)}`}
              size="small"
              color={confidence > 0.9 ? 'success' : confidence > 0.7 ? 'warning' : 'error'}
            />
          )}
        </Box>

        <Paper variant="outlined" sx={{ maxHeight: 500, overflow: 'auto' }}>
          {rows.map((row, idx) => (
            <Box
              key={idx}
              sx={{
                display: 'flex', alignItems: 'center', gap: 1,
                px: 2, py: 1,
                borderBottom: '1px solid', borderColor: 'divider',
                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.03) },
              }}
            >
              {editingRow === idx ? (() => {
                const isDuplicate = rows.some((r, i) => i !== idx && r.name.toUpperCase() === row.name.toUpperCase());
                return (
                  <>
                    <TextField
                      size="small" value={row.name}
                      onChange={(e) => updateRow(idx, 'name', e.target.value.toUpperCase())}
                      sx={{ width: 80 }}
                      label="Sıra"
                      error={isDuplicate}
                      helperText={isDuplicate ? 'Bu harf kullanılıyor' : ''}
                    />
                    <TextField
                      size="small" type="number" value={row.seatCount}
                      onChange={(e) => updateRow(idx, 'seatCount', parseInt(e.target.value) || 0)}
                      sx={{ width: 90 }}
                      label="Koltuk"
                    />
                    <IconButton size="small" color="primary" onClick={() => { if (!isDuplicate) setEditingRow(null); }}>
                      <CheckIcon fontSize="small" />
                    </IconButton>
                  </>
                );
              })() : (
                <>
                  <Typography sx={{ width: 40, fontWeight: 700, fontFamily: 'monospace' }}>
                    {row.name}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: '2px', flex: 1 }}>
                    {Array.from({ length: Math.min(row.seatCount, 30) }).map((_, i) => (
                      <Box key={i} sx={{
                        width: 8, height: 8, borderRadius: '1px',
                        bgcolor: alpha(theme.palette.primary.main, 0.4),
                      }} />
                    ))}
                    {row.seatCount > 30 && (
                      <Typography variant="caption" sx={{ fontSize: 9, color: 'text.disabled', ml: 0.5 }}>
                        +{row.seatCount - 30}
                      </Typography>
                    )}
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ width: 60, textAlign: 'right' }}>
                    {row.seatCount} koltuk
                  </Typography>
                  <IconButton size="small" onClick={() => setEditingRow(idx)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => removeRow(idx)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </>
              )}
            </Box>
          ))}
        </Paper>

        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
          <Button startIcon={<AddIcon />} onClick={addRow}>
            Sıra Ekle ({(() => {
              const usedNames = rows.map(r => r.name);
              const lastRow = rows[rows.length - 1];
              return lastRow ? getNextLetterAfter(lastRow.name, usedNames) : getNextAvailableLetter(usedNames);
            })()})
          </Button>
          <Typography variant="caption" color="text.disabled">
            Türkçe alfabe sırasına göre (Ç, Ğ, İ, Ö, Ş, Ü dahil)
          </Typography>
        </Stack>
      </Box>

      {/* Sağ: Preview */}
      <Box sx={{ width: 380, flexShrink: 0 }}>
        <SeatPreview />
      </Box>
    </Box>
  );

  const renderStep2 = () => (
    <Box sx={{ display: 'flex', gap: 3, mt: 2 }}>
      {/* Sol: Kategori ayarları */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <TextField
          fullWidth label="Şablon Adı" value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          placeholder="Hasan Can Kültür Merkezi Büyük Salon"
          sx={{ mb: 3 }}
        />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            Kategoriler
          </Typography>
          <Button size="small" startIcon={<AddIcon />} onClick={addCategory}>
            Kategori Ekle
          </Button>
        </Box>

        {categories.length === 0 && (
          <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
            <ColorIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary" gutterBottom>
              Henüz kategori tanımlanmadı
            </Typography>
            <Typography variant="body2" color="text.disabled">
              Sıraları bölgelere ayırmak için kategori ekleyin (opsiyonel)
            </Typography>
          </Paper>
        )}

        {categories.map((cat, catIdx) => {
          const range = getCategoryRange(cat);
          const seatCountInCat = rows
            .filter(r => cat.rows.includes(r.name))
            .reduce((sum, r) => sum + r.seatCount, 0);

          return (
            <Paper key={catIdx} variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1.5 }}>
                <input
                  type="color" value={cat.color}
                  onChange={(e) => updateCategory(catIdx, 'color', e.target.value)}
                  style={{ width: 32, height: 32, border: 'none', cursor: 'pointer', borderRadius: 4 }}
                />
                <TextField
                  size="small" value={cat.name} fullWidth
                  onChange={(e) => updateCategory(catIdx, 'name', e.target.value)}
                  label="Kategori Adı"
                />
                <IconButton size="small" color="error" onClick={() => removeCategory(catIdx)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>

              <Divider sx={{ mb: 1.5 }} />

              {/* Sıra aralığı seçimi */}
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Sıra aralığı seçin:
              </Typography>

              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
                <FormControl size="small" sx={{ minWidth: 80 }}>
                  <InputLabel>Başlangıç</InputLabel>
                  <Select
                    value={range.from}
                    label="Başlangıç"
                    onChange={(e) => updateCategoryRange(catIdx, e.target.value as string, range.to)}
                  >
                    {rowNames.map(name => (
                      <MenuItem key={name} value={name}>{name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Typography variant="body2" color="text.secondary" fontWeight={600}>—</Typography>

                <FormControl size="small" sx={{ minWidth: 80 }}>
                  <InputLabel>Bitiş</InputLabel>
                  <Select
                    value={range.to}
                    label="Bitiş"
                    onChange={(e) => updateCategoryRange(catIdx, range.from, e.target.value as string)}
                  >
                    {rowNames.map(name => (
                      <MenuItem key={name} value={name}>{name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Chip
                  size="small"
                  label={`${cat.rows.length} sıra · ${seatCountInCat} koltuk`}
                  sx={{ bgcolor: alpha(cat.color, 0.15), fontWeight: 600 }}
                />
              </Stack>

              {/* Seçili sıraların chip gösterimi */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {cat.rows.map(rowName => (
                  <Chip
                    key={rowName}
                    label={rowName}
                    size="small"
                    sx={{
                      bgcolor: alpha(cat.color, 0.25),
                      borderColor: cat.color,
                      fontWeight: 700,
                      fontSize: 11,
                    }}
                    variant="filled"
                  />
                ))}
              </Box>
            </Paper>
          );
        })}
      </Box>

      {/* Sağ: Preview */}
      <Box sx={{ width: 380, flexShrink: 0 }}>
        <SeatPreview />
      </Box>
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <IconButton onClick={() => navigate('/seat-templates')}>
          <BackIcon />
        </IconButton>
        <Box>
          <Typography variant="h5" fontWeight={700}>Yeni Salon Planı</Typography>
          <Typography variant="body2" color="text.secondary">
            PDF yükleyin, koltuk planı otomatik analiz edilsin
          </Typography>
        </Box>
      </Box>

      {/* Stepper */}
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Step content */}
      {activeStep === 0 && renderStep0()}
      {activeStep === 1 && renderStep1()}
      {activeStep === 2 && renderStep2()}

      {/* Fullscreen preview dialog */}
      <FullscreenPreviewDialog />

      {/* Navigation */}
      {activeStep > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            startIcon={<BackIcon />}
            onClick={() => setActiveStep(prev => prev - 1)}
          >
            Geri
          </Button>

          {activeStep < 2 ? (
            <Button
              variant="contained"
              endIcon={<NextIcon />}
              onClick={() => setActiveStep(prev => prev + 1)}
              disabled={rows.length === 0}
            >
              İleri
            </Button>
          ) : (
            <Button
              variant="contained"
              color="success"
              startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
              onClick={handleSave}
              disabled={saving || !templateName.trim()}
              sx={{ borderRadius: 2, px: 4 }}
            >
              {saving ? 'Kaydediliyor...' : 'Şablonu Kaydet'}
            </Button>
          )}
        </Box>
      )}
    </Box>
  );
}
