import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Grid, Paper, Typography, Stack, ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import ShareIcon from '@mui/icons-material/Share';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

import AdminShell from '../../components/AdminShell';
import { useRole } from '../../hooks/useRole';
import { darkAdmin } from '../../theme/darkAdmin';
import {
  getShareStats, ENTITY_LABEL, type ShareStatsView,
} from '../../services/nartbusiness/shareStatsService';

const PIE_COLORS = ['#C9A227', '#1B2A4A', '#2D7A50', '#8B6B14', '#4A2D7A', '#E07B1A', '#888'];

function SectionCard({
  title, subtitle, children, minHeight,
}: { title: string; subtitle?: string; children: React.ReactNode; minHeight?: number }) {
  return (
    <Paper variant="outlined" sx={{
      p: 2.5, borderRadius: 2, bgcolor: darkAdmin.bg.card,
      borderColor: darkAdmin.border.default, height: '100%', minHeight,
    }}>
      <Box sx={{ mb: 2 }}>
        <Typography sx={{ ...darkAdmin.sx.sectionLabel }}>{title}</Typography>
        {subtitle && (
          <Typography sx={{ mt: 0.5, fontSize: 11, color: darkAdmin.text.secondary }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {children}
    </Paper>
  );
}

function StatTile({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Paper variant="outlined" sx={{
      p: 2, borderRadius: 2, bgcolor: darkAdmin.bg.card, borderColor: darkAdmin.border.default,
    }}>
      <Typography sx={{ fontSize: 11, color: darkAdmin.text.secondary, fontWeight: 700 }}>
        {label}
      </Typography>
      <Typography sx={{ mt: 0.5, fontSize: 28, fontWeight: 800, color }}>
        {value.toLocaleString('tr-TR')}
      </Typography>
    </Paper>
  );
}

export default function NbShareAnalytics() {
  const { roles } = useRole();
  const allowed = roles.includes('ADMIN') || roles.includes('NB_ADMIN');
  const [days, setDays] = useState<number>(30);

  const query = useQuery({
    queryKey: ['nb-share-stats', days],
    queryFn: () => getShareStats(days),
    staleTime: 120_000,
    enabled: allowed,
  });

  const stats: ShareStatsView[] = query.data ?? [];

  const totals = useMemo(() => {
    const clicks = stats.reduce((s, x) => s + (x.clicks || 0), 0);
    const shares = stats.reduce((s, x) => s + (x.shares || 0), 0);
    return { clicks, shares };
  }, [stats]);

  const entityData = useMemo(
    () => stats.map((x) => ({
      name: ENTITY_LABEL[x.entityType] ?? x.entityType,
      'Tıklama': x.clicks,
      'Paylaşım': x.shares,
    })),
    [stats],
  );

  const platformData = useMemo(() => {
    const agg: Record<string, number> = {};
    for (const x of stats) {
      for (const [p, c] of Object.entries(x.byPlatform ?? {})) {
        agg[p] = (agg[p] ?? 0) + (c as number);
      }
    }
    return Object.entries(agg)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [stats]);

  const isEmpty = !query.isLoading && totals.clicks === 0 && totals.shares === 0;

  if (!allowed) return <Navigate to="/dashboard" replace />;

  return (
    <AdminShell
      title="Paylaşım Analitikleri"
      subtitle="NB ilan / işletme / soru paylaşım linkleri — açılış (tıklama) ve uygulama içi paylaşım"
      icon={<ShareIcon sx={{ fontSize: 26 }} />}
      label="NartBusiness • Paylaşım"
      isFetching={query.isFetching}
      lastUpdatedAt={query.dataUpdatedAt || null}
      onRefresh={() => query.refetch()}
      actions={
        <ToggleButtonGroup
          size="small" exclusive value={days}
          onChange={(_, v) => { if (v !== null) setDays(Number(v)); }}
          sx={{
            bgcolor: darkAdmin.bg.surface,
            border: `1px solid ${darkAdmin.border.default}`,
          }}
        >
          {[7, 30, 90].map((d) => (
            <ToggleButton key={d} value={d} sx={{ fontSize: 11, fontWeight: 700, px: 1.5, py: 0.5, textTransform: 'none', border: 'none' }}>
              {d} gün
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      }
    >
      {isEmpty ? (
        <Paper variant="outlined" sx={{ p: 5, textAlign: 'center', bgcolor: darkAdmin.bg.card, borderColor: darkAdmin.border.default }}>
          <Typography sx={{ color: darkAdmin.text.secondary }}>
            Seçili dönemde paylaşım verisi yok.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {/* Özet kutular */}
          <Grid item xs={6} md={3}>
            <StatTile label="Toplam Tıklama" value={totals.clicks} color="#1B2A4A" />
          </Grid>
          <Grid item xs={6} md={3}>
            <StatTile label="Toplam Paylaşım" value={totals.shares} color="#C9A227" />
          </Grid>
          {stats.map((x) => (
            <Grid item xs={6} md={3} key={x.entityType}>
              <StatTile
                label={`${ENTITY_LABEL[x.entityType] ?? x.entityType} (tık / paylaşım)`}
                value={x.clicks + x.shares}
                color={darkAdmin.text.primary as string}
              />
            </Grid>
          ))}

          {/* Entity bazlı bar */}
          <Grid item xs={12} md={7}>
            <SectionCard title="İçerik Türüne Göre" subtitle="Tıklama (link açılışı) vs uygulama içi paylaşım" minHeight={320}>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={entityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkAdmin.border.default} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Tıklama" fill="#1B2A4A" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Paylaşım" fill="#C9A227" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>
          </Grid>

          {/* Platform dağılımı */}
          <Grid item xs={12} md={5}>
            <SectionCard title="Platform Dağılımı" subtitle="Uygulama içi paylaşımların platform kırılımı" minHeight={320}>
              {platformData.length === 0 ? (
                <Typography sx={{ color: darkAdmin.text.secondary, fontSize: 13 }}>
                  Henüz platform verisi yok (paylaşım kaydı geldikçe dolar).
                </Typography>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={platformData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                      {platformData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </SectionCard>
          </Grid>
        </Grid>
      )}
    </AdminShell>
  );
}
