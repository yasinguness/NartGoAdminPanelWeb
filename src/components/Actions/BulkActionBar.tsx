import { useCallback, useMemo, useState } from 'react';
import { Box, Button, CircularProgress, Paper, Typography, alpha } from '@mui/material';
import type { ReactNode } from 'react';

export interface BulkAction {
  label: string;
  color?: 'success' | 'error' | 'warning' | 'primary' | 'inherit';
  icon?: ReactNode;
  /** Verilirse aksiyondan önce window.confirm ile onay sorulur (yıkıcı işlemler). */
  confirm?: string;
  onClick: () => void | Promise<void>;
}

/**
 * Moderasyon kuyruklarında ortak toplu-aksiyon çubuğu. Seçim varken tablonun
 * üstünde sticky görünür; "{n} seçili" + aksiyon butonları + Temizle.
 */
export function BulkActionBar({
  count,
  onClear,
  actions,
  busy = false,
}: {
  count: number;
  onClear: () => void;
  actions: BulkAction[];
  busy?: boolean;
}) {
  if (count === 0) return null;
  return (
    <Paper
      elevation={2}
      sx={{
        mb: 2,
        px: 2,
        py: 1.25,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        position: 'sticky',
        top: 0,
        zIndex: 3,
        bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
        border: '1px solid',
        borderColor: (t) => alpha(t.palette.primary.main, 0.3),
      }}
    >
      <Typography fontWeight={600} variant="body2">
        {count} seçili
      </Typography>
      <Box flexGrow={1} />
      {busy && <CircularProgress size={18} sx={{ mr: 1 }} />}
      {actions.map((a) => (
        <Button
          key={a.label}
          size="small"
          variant="contained"
          color={a.color ?? 'primary'}
          startIcon={a.icon}
          disabled={busy}
          onClick={() => {
            if (a.confirm && !window.confirm(a.confirm)) return;
            void a.onClick();
          }}
        >
          {a.label}
        </Button>
      ))}
      <Button size="small" color="inherit" disabled={busy} onClick={onClear}>
        Temizle
      </Button>
    </Paper>
  );
}

/** Satır seçim durumu (Set tabanlı) — checkbox'lı moderasyon tabloları için. */
export function useRowSelection() {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const setAll = useCallback((ids: string[], checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) ids.forEach((id) => next.add(id));
      else ids.forEach((id) => next.delete(id));
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);

  return useMemo(
    () => ({
      selected,
      ids: Array.from(selected),
      count: selected.size,
      has: (id: string) => selected.has(id),
      toggle,
      setAll,
      clear,
    }),
    [selected, toggle, setAll, clear],
  );
}
