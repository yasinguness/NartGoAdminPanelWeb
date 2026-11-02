/**
 * Editor's Desk: NartGo'nun içerik planlama aracı (akış, takvim, stüdyo, fakt bankası, atlas…).
 *
 * Uygulama ayrı geliştirilen tek dosyalık bir HTML'dir (public/desk/, scripts/sync-editors-desk.sh ile
 * güncellenir). Aynı origin'den iframe içinde açılır; panelin oturum anahtarını claude-shim.js okur.
 */

import { useEffect, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';
import { api } from '../../services/api';
import { handleUnauthorized } from '../../services/authEvents';

const BAR = 40;

export default function EditorsDesk() {
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin === window.location.origin && e.data?.type === 'desk:unauthorized') handleUnauthorized();
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  /** Postlar, fakt kararları, fikirler…: içe aktarmayla aynı biçimde; Berk düzeltmeleri Foundry'ye buradan işler. */
  const exportAll = async () => {
    setExporting(true);
    try {
      const res = await api.get('/content/admin/desk/export', { responseType: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(res.data as Blob);
      a.download = `desk-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 30000);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ height: BAR, px: 2, display: 'flex', alignItems: 'center', gap: 1, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }}>Editor's Desk</Typography>
        <Button size="small" startIcon={<DownloadIcon />} onClick={exportAll} disabled={exporting}>
          Dışa aktar (JSON)
        </Button>
      </Box>
      <Box
        component="iframe"
        title="Editor's Desk"
        src={`${import.meta.env.BASE_URL}desk/index.html`}
        sx={{ flex: 1, border: 0, width: '100%', display: 'block' }}
      />
    </Box>
  );
}
