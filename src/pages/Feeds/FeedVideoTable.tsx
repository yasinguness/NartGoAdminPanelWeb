import { useState } from 'react';
import {
  Box, Typography, Checkbox, Chip, Menu, MenuItem,
  Avatar, Stack, Table, TableHead, TableBody,
  TableRow, TableCell, TableSortLabel, Paper, Divider
} from '@mui/material';
import { Play, Calendar, User, Clock, Trash2, Eye } from 'lucide-react';
import { FeedDto, FeedStatus } from '../../types/feed/feedModel';

interface Props {
  videos: FeedDto[];
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
  onSelectAll: () => void;
  onClick: (video: FeedDto) => void;
  onStatusChange: (id: string, status: FeedStatus) => void;
  onDelete: (id: string) => void;
  sortField: string;
  sortDir: 'asc' | 'desc';
  onSort: (field: string) => void;
  statusConfig: Record<FeedStatus, { label: string; color: string; bg: string; border: string }>;
}

export default function FeedVideoTable({
  videos, selectedIds, onSelect, onSelectAll, onClick,
  onStatusChange, onDelete, sortField, sortDir, onSort, statusConfig
}: Props) {
  const [statusAnchor, setStatusAnchor] = useState<{ el: HTMLElement; videoId: string } | null>(null);
  const allSelected = videos.length > 0 && selectedIds.size === videos.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

  return (
    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, overflow: 'hidden' }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: '#fafafa' }}>
            <TableCell padding="checkbox" sx={{ pl: 2 }}>
              <Checkbox size="small" checked={allSelected} indeterminate={someSelected} onChange={onSelectAll} />
            </TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary' }}>VIDEO</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary' }}>STATUS</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary' }}>STATS</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary' }}>
              <TableSortLabel active={sortField === 'createdAt'} direction={sortField === 'createdAt' ? sortDir : 'asc'} onClick={() => onSort('createdAt')}>
                UPLOAD DATE
              </TableSortLabel>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {videos.map((video) => {
            const cfg = statusConfig[video.status] || statusConfig[FeedStatus.UPLOADED_RAW];
            const isSelected = selectedIds.has(video.id);

            return (
              <TableRow key={video.id} hover onClick={() => onClick(video)} sx={{ cursor: 'pointer', bgcolor: isSelected ? 'rgba(22, 70, 28, 0.03)' : 'transparent' }}>
                <TableCell padding="checkbox" sx={{ pl: 2 }}>
                  <Checkbox size="small" checked={isSelected} onClick={(e) => { e.stopPropagation(); onSelect(video.id); }} />
                </TableCell>
                <TableCell>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Box sx={{ width: 48, height: 28, borderRadius: 1, bgcolor: '#eee', flexShrink: 0, backgroundImage: `url(${video.thumbnailUrl})`, backgroundSize: 'cover', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {!video.thumbnailUrl && <Play size={12} />}
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem', lineHeight: 1.2 }}>{video.title}</Typography>
                      <Typography variant="caption" color="text.secondary">@{video.creatorUsername || 'anonymous'}</Typography>
                    </Box>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Chip
                    label={cfg.label}
                    size="small"
                    onClick={(e) => { e.stopPropagation(); setStatusAnchor({ el: e.currentTarget, videoId: video.id }); }}
                    sx={{ height: 24, fontSize: '0.65rem', fontWeight: 600, color: cfg.color, bgcolor: cfg.bg, border: `1px solid ${cfg.border}`, cursor: 'pointer' }}
                  />
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1} sx={{ color: 'text.secondary' }}>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Eye size={12} /> <Typography variant="caption" sx={{ fontWeight: 600 }}>{video.viewCount || 0}</Typography>
                    </Stack>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Typography variant="caption">{formatDate(video.createdAt)}</Typography>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Menu anchorEl={statusAnchor?.el} open={Boolean(statusAnchor)} onClose={() => setStatusAnchor(null)}>
        {(Object.keys(statusConfig) as FeedStatus[]).map((s) => (
          <MenuItem key={s} onClick={() => { if (statusAnchor) onStatusChange(statusAnchor.videoId, s); setStatusAnchor(null); }} sx={{ fontSize: '0.75rem' }}>
            {statusConfig[s].label}
          </MenuItem>
        ))}
        <Divider />
        <MenuItem onClick={() => { if (statusAnchor) onDelete(statusAnchor.videoId); setStatusAnchor(null); }} sx={{ fontSize: '0.75rem', color: 'error.main' }}>
          <Trash2 size={14} style={{ marginRight: 8 }} /> Sil
        </MenuItem>
      </Menu>
    </Paper>
  );
}
