/**
 * Editör Masası: içerik planlama, Instagram paylaşımı ve ölçümü tek sayfada (docs/plan/nartgo-editor-masasi.md).
 * Sekmeler: Plan (Editor's Desk, ayrı uygulama, iframe) · Paylaşım (kuyruk) · Performans · Hesap.
 * Sekme adreste tutulur (?tab=); eski adresler (/editors-desk, /instagram-queue, /instagram-analytics) buraya yönlenir.
 */
import { useSearchParams } from 'react-router-dom';
import { Box, Tab, Tabs } from '@mui/material';
import EditorsDesk from '../EditorsDesk/EditorsDesk';
import InstagramQueue from '../EditorsDesk/InstagramQueue';
import InstagramAnalytics from '../InstagramAnalytics/InstagramAnalytics';
import PerformanceTab from './PerformanceTab';

const EDITOR_TABS = [
  { key: 'plan', label: 'Plan' },
  { key: 'paylasim', label: 'Paylaşım' },
  { key: 'performans', label: 'Performans' },
  { key: 'hesap', label: 'Hesap' },
] as const;
type TabKey = (typeof EDITOR_TABS)[number]['key'];

const TAB_BAR = 48;

export default function EditorMasasi() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const tab: TabKey = EDITOR_TABS.some(t => t.key === raw) ? (raw as TabKey) : 'plan';

  return (
    <Box>
      <Box sx={{ height: TAB_BAR, borderBottom: 1, borderColor: 'divider', px: 1 }}>
        <Tabs value={tab} onChange={(_, v: TabKey) => setParams({ tab: v }, { replace: true })} variant="scrollable" scrollButtons="auto">
          {EDITOR_TABS.map(t => <Tab key={t.key} value={t.key} label={t.label} sx={{ minHeight: TAB_BAR }} />)}
        </Tabs>
      </Box>
      {/* Desk iframe tam yüksekliği kullanır ve sekme değişince kapanmaz (yeniden yüklenip yazılanı kaybetmesin). */}
      <Box sx={{ display: tab === 'plan' ? 'block' : 'none' }}>
        <EditorsDesk height={`calc(100vh - 64px - ${TAB_BAR}px)`} />
      </Box>
      {tab !== 'plan' && (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
          {tab === 'paylasim' && <InstagramQueue />}
          {tab === 'performans' && <PerformanceTab />}
          {tab === 'hesap' && <InstagramAnalytics />}
        </Box>
      )}
    </Box>
  );
}
