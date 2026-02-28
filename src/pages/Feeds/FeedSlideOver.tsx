import {
  Box, Typography, IconButton, Stack, Chip, Divider,
} from '@mui/material';
import { X, Play, Calendar, Clock, User, ShieldCheck, Trash2, Eye, Heart, MessageCircle, Share2, Globe, Lock, Music, CheckCircle2 } from 'lucide-react';
import { Avatar } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { FeedDto, FeedStatus } from '../../types/feed/feedModel';

import ReactPlayer from 'react-player';

interface Props {
  video: FeedDto | null;
  open: boolean;
  onClose: () => void;
  onStatusChange: (id: string, status: FeedStatus) => void;
  onDelete: (id: string) => void;
  statusConfig: Record<FeedStatus, { label: string; color: string; bg: string; border: string }>;
}

export default function FeedSlideOver({ video, open, onClose, onStatusChange, onDelete, statusConfig }: Props) {
  if (!video) return null;

  // Smart URL selection
  const videoSource = video.hlsReady ? video.playlistUrl : video.rawVideoUrl || video.videoUrl;

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
              <Stack direction="row" spacing={0.5}>
                <IconButton size="small" onClick={() => { if (video) onDelete(video.id); onClose(); }} sx={{ color: 'error.main' }}>
                  <Trash2 size={18} />
                </IconButton>
                <IconButton size="small" onClick={onClose}><X size={18} /></IconButton>
              </Stack>
            </Box>

            <Box sx={{ flex: 1, overflow: 'auto', px: 3, py: 2.5 }}>
              <Box sx={{ 
                position: 'relative', 
                width: '100%', 
                paddingTop: '177.77%', // 9:16 for portrait videos (common in feeds)
                borderRadius: 2.5, 
                overflow: 'hidden', 
                mb: 2.5, 
                bgcolor: '#000',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}>
                <Box sx={{ position: 'absolute', inset: 0 }}>
                  <ReactPlayer
                    src={videoSource}
                    width="100%"
                    height="100%"
                    controls
                    playing={false}
                    light={!videoSource ? video.imageUrl || video.thumbnailUrl : false}
                    playIcon={<Play size={32} fill="#fff" />}
                    config={{
                      file: {
                        forceHLS: video.hlsReady,
                        attributes: {
                          controlsList: 'nodownload'
                        }
                      }
                    } as any}
                  />
                  {!videoSource && (
                     <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.4)', color: '#fff' }}>
                       <Typography variant="caption">Video URL not found</Typography>
                     </Box>
                  )}
                </Box>
              </Box>

              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                <Avatar src={video.creatorAvatarUrl} sx={{ width: 32, height: 32 }}>
                  {(video.creatorUsername?.charAt(0)?.toUpperCase()) || <User size={16} />}
                </Avatar>
                <Box>
                  <Typography variant="subtitle2" sx={{ lineHeight: 1, fontWeight: 600 }}>{video.creatorUsername || 'Unknown User'}</Typography>
                  <Typography variant="caption" color="text.secondary">@{video.creatorId || 'anonymous'}</Typography>
                </Box>
              </Stack>

              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.05rem', mb: 1 }}>{video.title || 'Untitled video'}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>{video.description || video.summary || video.content}</Typography>

              {/* Stats Bar */}
              <Stack direction="row" spacing={3} sx={{ mb: 3, p: 2, bgcolor: '#f9fafb', borderRadius: 2.5 }}>
                {[
                  { icon: <Eye size={16} />, label: 'Views', value: video.viewCount || 0 },
                  { icon: <Heart size={16} />, label: 'Likes', value: video.likeCount || 0 },
                  { icon: <MessageCircle size={16} />, label: 'Comments', value: video.commentCount || 0 },
                  { icon: <Share2 size={16} />, label: 'Shares', value: video.shareCount || 0 },
                ].map((stat, i) => (
                  <Box key={i} sx={{ textAlign: 'center' }}>
                    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: 'text.secondary', mb: 0.5 }}>
                      {stat.icon}
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>{stat.value.toLocaleString()}</Typography>
                    </Stack>
                    <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.disabled', textTransform: 'uppercase' }}>{stat.label}</Typography>
                  </Box>
                ))}
              </Stack>

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
                { icon: <ShieldCheck size={14} />, label: 'Status', value: video.status },
                { icon: <Music size={14} />, label: 'Music', value: video.musicTitle ? `${video.musicTitle} - ${video.musicArtist}` : '-' },
                { icon: <CheckCircle2 size={14} />, label: 'HLS Status', value: video.hlsReady ? 'Ready' : 'Processing', color: video.hlsReady ? 'success.main' : 'warning.main' },
                { icon: <Clock size={14} />, label: 'Duration', value: video.durationSeconds ? `${video.durationSeconds.toFixed(1)}s` : '-' },
              ].map((item: any, i) => (
                <Stack key={i} direction="row" justifyContent="space-between" sx={{ py: 1, borderBottom: '1px solid #f3f4f6' }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ color: 'text.secondary' }}>
                    {item.icon} <Typography variant="caption">{item.label}</Typography>
                  </Stack>
                  <Typography variant="caption" sx={{ fontWeight: 500, color: item.color || 'inherit' }}>{item.value}</Typography>
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
