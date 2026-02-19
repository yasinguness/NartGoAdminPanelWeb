import {
  Box, Typography, IconButton, Stack, Chip, Divider,
} from '@mui/material';
import { X, Play, Calendar, Clock, User, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FeedDto, FeedStatus } from '../../types/feed/feedModel';

interface Props {
  video: FeedDto | null;
  open: boolean;
  onClose: () => void;
  onStatusChange: (id: string, status: FeedStatus) => void;
  statusConfig: Record<FeedStatus, { label: string; color: string; bg: string; border: string }>;
}

export default function FeedSlideOver({ video, open, onClose, onStatusChange, statusConfig }: Props) {
  if (!video) return null;

  const formatDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
            style={{ position: 'fixed', inset: 0, zIndex: 1200, backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)' }} />

          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 480, maxWidth: '100vw', zIndex: 1300, backgroundColor: '#fff', boxShadow: '-8px 0 30px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column' }}>
            
            <Box sx={{ px: 3, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Video Content Details</Typography>
              <IconButton size="small" onClick={onClose}><X size={18} /></IconButton>
            </Box>

            <Box sx={{ flex: 1, overflow: 'auto', px: 3, py: 2.5 }}>
              <Box sx={{ position: 'relative', width: '100%', paddingTop: '56.25%', borderRadius: 2.5, overflow: 'hidden', mb: 2.5, bgcolor: '#f3f4f6', backgroundImage: `url(${video.imageUrl || video.thumbnailUrl})`, backgroundSize: 'cover' }}>
                <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.2)' }}>
                  <IconButton sx={{ bgcolor: '#fff', '&:hover': { bgcolor: '#f9fafb' } }} onClick={() => video.videoUrl && window.open(video.videoUrl, '_blank')}>
                    <Play size={24} fill="currentColor" />
                  </IconButton>
                </Box>
              </Box>

              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.05rem', mb: 1 }}>{video.title}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>{video.summary || video.content}</Typography>

              <Box sx={{ mb: 3 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', mb: 1, display: 'block' }}>Update Status</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {(Object.keys(statusConfig) as FeedStatus[]).map((s) => {
                    const cfg = statusConfig[s];
                    const active = s === video.status;
                    return (
                      <Chip key={s} label={cfg.label} size="small" onClick={() => onStatusChange(video.id, s)}
                        sx={{ fontSize: '0.7rem', fontWeight: 600, color: active ? cfg.color : '#9ca3af', bgcolor: active ? cfg.bg : '#f9fafb', border: `1.5px solid ${active ? cfg.border : '#e5e7eb'}`, cursor: 'pointer' }} />
                    );
                  })}
                </Stack>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', mb: 1.5, display: 'block' }}>Information</Typography>
              {[
                { icon: <Calendar size={14} />, label: 'Created At', value: formatDate(video.createdAt) },
                { icon: <ShieldCheck size={14} />, label: 'Moderated At', value: formatDate(video.moderatedAt) },
                { icon: <User size={14} />, label: 'Moderated By', value: video.moderatedBy || '-' },
                { icon: <ShieldCheck size={14} />, label: 'Status', value: video.status },
              ].map((item, i) => (
                <Stack key={i} direction="row" justifyContent="space-between" sx={{ py: 1, borderBottom: '1px solid #f3f4f6' }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ color: 'text.secondary' }}>
                    {item.icon} <Typography variant="caption">{item.label}</Typography>
                  </Stack>
                  <Typography variant="caption" sx={{ fontWeight: 500 }}>{item.value}</Typography>
                </Stack>
              ))}

              {video.rejectionReason && (
                <Box sx={{ mt: 2, p: 2, bgcolor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 2 }}>
                  <Typography variant="caption" color="error.main" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>Rejection Reason</Typography>
                  <Typography variant="body2" color="error.dark">{video.rejectionReason}</Typography>
                </Box>
              )}
            </Box>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
