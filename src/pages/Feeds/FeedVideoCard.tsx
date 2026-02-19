import { useState } from 'react';
import {
  Box, Typography, Checkbox, Paper, Chip, Menu, MenuItem,
  Avatar, Stack, Tooltip
} from '@mui/material';
import { Play, Calendar, User, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { FeedDto, FeedStatus } from '../../types/feed/feedModel';

interface FeedVideoCardProps {
  video: FeedDto;
  selected: boolean;
  onSelect: (id: string) => void;
  onClick: (video: FeedDto) => void;
  onStatusChange: (id: string, status: FeedStatus) => void;
  statusConfig: Record<FeedStatus, { label: string; color: string; bg: string; border: string }>;
}

export default function FeedVideoCard({ video, selected, onSelect, onClick, onStatusChange, statusConfig }: FeedVideoCardProps) {
  const [hovered, setHovered] = useState(false);
  const [statusAnchor, setStatusAnchor] = useState<null | HTMLElement>(null);
  
  const cfg = statusConfig[video.status] || statusConfig[FeedStatus.DRAFT];

  const formatDate = (d?: string) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
  };

  // Generate a consistent gradient based on title for the thumbnail placeholder
  const getGradient = (seed: string) => {
    const colors = [
      ['#667eea', '#764ba2'], ['#f093fb', '#f5576c'], ['#4facfe', '#00f2fe'],
      ['#43e97b', '#38f9d7'], ['#fa709a', '#fee140'], ['#a18cd1', '#fbc2eb']
    ];
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    const pair = colors[Math.abs(hash) % colors.length];
    return `linear-gradient(135deg, ${pair[0]} 0%, ${pair[1]} 100%)`;
  };

  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <Paper
        elevation={0}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        sx={{
          border: '1px solid',
          borderColor: selected ? 'primary.main' : 'divider',
          borderRadius: 2.5,
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          bgcolor: selected ? 'rgba(22, 70, 28, 0.03)' : 'background.paper',
          '&:hover': {
            borderColor: 'primary.light',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          },
        }}
      >
        <Box
          onClick={() => onClick(video)}
          sx={{
            position: 'relative',
            width: '100%',
            paddingTop: '56.25%',
            background: video.thumbnailUrl ? `url(${video.thumbnailUrl})` : getGradient(video.title),
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.2)', opacity: hovered ? 1 : 0, transition: 'opacity 0.25s' }}>
            <Box sx={{ width: 44, height: 44, borderRadius: '50%', bgcolor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.2)' }}>
              <Play size={20} fill="currentColor" />
            </Box>
          </Box>
          <Box sx={{ position: 'absolute', top: 4, left: 4, opacity: hovered || selected ? 1 : 0 }}>
            <Checkbox size="small" checked={selected} onClick={(e) => { e.stopPropagation(); onSelect(video.id); }} sx={{ color: '#fff', '&.Mui-checked': { color: '#fff' } }} />
          </Box>
        </Box>

        <Box sx={{ p: 1.75 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, height: 40, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {video.title}
          </Typography>

          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box>
              <Chip
                label={cfg.label}
                size="small"
                onClick={(e) => { e.stopPropagation(); setStatusAnchor(e.currentTarget); }}
                onDelete={(e) => { e.stopPropagation(); setStatusAnchor(e.currentTarget as HTMLElement); }}
                deleteIcon={<ChevronDown size={12} />}
                sx={{
                  height: 24, fontSize: '0.65rem', fontWeight: 600,
                  color: cfg.color, bgcolor: cfg.bg, border: `1px solid ${cfg.border}`,
                }}
              />
              <Menu anchorEl={statusAnchor} open={Boolean(statusAnchor)} onClose={() => setStatusAnchor(null)} onClick={(e) => e.stopPropagation()}>
                {(Object.keys(statusConfig) as FeedStatus[]).map((s) => (
                  <MenuItem key={s} selected={s === video.status} onClick={() => { onStatusChange(video.id, s); setStatusAnchor(null); }} sx={{ fontSize: '0.75rem' }}>
                    {statusConfig[s].label}
                  </MenuItem>
                ))}
              </Menu>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Calendar size={12} /> {formatDate(video.createdAt)}
            </Typography>
          </Stack>
        </Box>
      </Paper>
    </motion.div>
  );
}
