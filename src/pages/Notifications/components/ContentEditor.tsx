import React, { useState } from 'react';
import {
    Box, Typography, TextField, Stack, Grid, Paper,
    alpha, Divider, IconButton, Tooltip,
} from '@mui/material';
import {
    PhoneIphone as IosIcon, PhoneAndroid as AndroidIcon, Image as ImageIcon,
} from '@mui/icons-material';
import { CampaignContent } from '../../../types/notifications/campaign';
import DeepLinkBuilder from './DeepLinkBuilder';

interface ContentEditorProps {
    content: CampaignContent;
    onChange: (content: CampaignContent) => void;
}

const EMOJIS = ['🔔', '🎉', '🚀', '📊', '💬', '📍', '⚡', '🎯', '❤️', '✨', '🔥', '⏰', '📋', '🎬', '💙', '⭐'];
const MAX_TITLE = 65;
const MAX_BODY = 240;

export default function ContentEditor({ content, onChange }: ContentEditorProps) {
    const [showDLBuilder, setShowDLBuilder] = useState(false);
    const upd = (k: keyof CampaignContent, v: string) => onChange({ ...content, [k]: v });

    return (
        <Box>
            {/* Title */}
            <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle2" fontWeight={700}>Başlık</Typography>
                <Typography variant="caption" color={(content.title?.length || 0) > MAX_TITLE ? 'error.main' : 'text.secondary'}>
                    {content.title?.length || 0}/{MAX_TITLE}
                </Typography>
            </Stack>
            <TextField fullWidth size="small" value={content.title || ''} onChange={e => upd('title', e.target.value)}
                placeholder="Bildirim başlığını girin..." sx={{ mb: 0.5 }} />
            <Stack direction="row" spacing={0.5} sx={{ mb: 2, flexWrap: 'wrap' }}>
                {EMOJIS.map(e => (<Tooltip key={e} title={`${e} ekle`}><IconButton size="small"
                    onClick={() => upd('title', (content.title || '') + e)} sx={{ fontSize: '1rem', width: 28, height: 28 }}>{e}</IconButton></Tooltip>))}
            </Stack>

            {/* Body */}
            <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle2" fontWeight={700}>Mesaj İçeriği</Typography>
                <Typography variant="caption" color={(content.body?.length || 0) > MAX_BODY ? 'error.main' : 'text.secondary'}>
                    {content.body?.length || 0}/{MAX_BODY}
                </Typography>
            </Stack>
            <TextField fullWidth multiline minRows={3} maxRows={6} size="small" value={content.body || ''}
                onChange={e => upd('body', e.target.value)} placeholder="Bildirim mesajını yazın..." sx={{ mb: 2 }} />

            {/* Image URL */}
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                <ImageIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />Görsel URL (opsiyonel)
            </Typography>
            <TextField fullWidth size="small" value={content.imageUrl || ''}
                onChange={e => upd('imageUrl', e.target.value)} placeholder="https://example.com/image.png" sx={{ mb: 2 }} />

            {/* Deep Link */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle2" fontWeight={700}>Deep Link (zorunlu)</Typography>
                <Typography variant="caption" color="primary" sx={{ cursor: 'pointer', fontWeight: 600 }}
                    onClick={() => setShowDLBuilder(!showDLBuilder)}>
                    {showDLBuilder ? 'Kapat' : 'Deep Link Oluştur'}
                </Typography>
            </Stack>
            {showDLBuilder ? (
                <DeepLinkBuilder value={content.deepLink || ''} onChange={link => upd('deepLink', link)} />
            ) : (
                <TextField fullWidth size="small" value={content.deepLink || ''}
                    onChange={e => upd('deepLink', e.target.value)} placeholder="/explore" sx={{ fontFamily: 'monospace', mb: 2 }} />
            )}

            <Divider sx={{ my: 3 }} />

            {/* iOS / Android Preview */}
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>Önizleme</Typography>
            <Grid container spacing={2}>
                <Grid item xs={6}>
                    <NotifPreview platform="ios" title={content.title} body={content.body} imageUrl={content.imageUrl} />
                </Grid>
                <Grid item xs={6}>
                    <NotifPreview platform="android" title={content.title} body={content.body} imageUrl={content.imageUrl} />
                </Grid>
            </Grid>
        </Box>
    );
}

function NotifPreview({ platform, title, body, imageUrl }: { platform: 'ios' | 'android'; title?: string; body?: string; imageUrl?: string }) {
    const isIos = platform === 'ios';
    return (
        <Paper sx={{
            p: 0, borderRadius: 3, overflow: 'hidden', border: '1px solid', borderColor: 'divider',
            background: isIos ? 'linear-gradient(180deg,#f8f8f8 0%,#fff 100%)' : 'linear-gradient(180deg,#1a1a2e 0%,#16213e 100%)',
            color: isIos ? 'inherit' : '#fff',
        }}>
            <Box sx={{ px: 1.5, py: 0.5, bgcolor: isIos ? '#f0f0f0' : alpha('#fff', 0.05), display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {isIos ? <IosIcon sx={{ fontSize: 14, color: '#666' }} /> : <AndroidIcon sx={{ fontSize: 14, color: '#a4c639' }} />}
                <Typography variant="caption" fontWeight={700} color={isIos ? '#666' : '#a4c639'}>{isIos ? 'iOS' : 'Android'}</Typography>
            </Box>
            <Box sx={{ p: 1.5 }}>
                <Stack direction="row" spacing={1} alignItems="flex-start">
                    <Box sx={{ width: 32, height: 32, borderRadius: isIos ? 1 : '50%', bgcolor: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Typography fontSize={14}>🔔</Typography>
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="caption" fontWeight={800} sx={{ fontSize: '0.65rem', color: isIos ? undefined : '#a0a0a0' }}>
                                {isIos ? 'NARTGO' : 'NartGo'}
                            </Typography>
                            <Typography variant="caption" sx={{ fontSize: '0.55rem', color: isIos ? 'text.secondary' : '#666' }}>şimdi</Typography>
                        </Stack>
                        <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.7rem', lineHeight: 1.2 }} noWrap>
                            {title || 'Başlık girilmedi'}
                        </Typography>
                        <Typography variant="caption" sx={{
                            fontSize: '0.6rem', lineHeight: 1.2, color: isIos ? 'text.secondary' : '#ccc',
                            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                        }}>
                            {body || 'Mesaj girilmedi'}
                        </Typography>
                    </Box>
                </Stack>
            </Box>
        </Paper>
    );
}
