import { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    Avatar,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Grid,
    IconButton,
    LinearProgress,
    MenuItem,
    Pagination,
    Paper,
    Stack,
    TextField,
    Tooltip,
    Typography,
    alpha,
    useTheme,
} from '@mui/material';
import {
    Delete as DeleteIcon,
    EmojiEvents as TrophyIcon,
    Event as EventIcon,
    Groups as ReferralIcon,
    Person as ProfileIcon,
    Share as ShareIcon,
    Star as StarIcon,
    Storefront as BusinessIcon,
    ThumbUp as LikeIcon,
    Warning as PenaltyIcon,
    Comment as CommentIcon,
    LocalFireDepartment as StreakIcon,
    Campaign as BulletinIcon,
    FilterList as FilterIcon,
    Refresh as RefreshIcon,
    Info as InfoIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { userService } from '../../../services/user/userService';
import ConfirmDialog from '../../../components/Actions/ConfirmDialog';
import type {
    AdminUserGamificationRewardDetailDto,
    AdminUserGamificationRewardItemDto,
    AdminUserGamificationRewardsPage,
} from '../../../types/gamification/adminUserGamification';

// ── Reason labels & icons ──────────────────────────────────────────────────

const REASON_LABELS: Record<string, string> = {
    BUSINESS_REPORT: 'İşletme Bildirimi',
    BUSINESS_CONFIRMATION: 'İşletme Onayı',
    CLAIM_APPROVED: 'Sahiplik Onayı',
    PROFILE_COMPLETED: 'Profil Tamamlandı',
    BULLETIN_POSTED: 'Bülten Yayınlandı',
    EVENT_JOINED: 'Etkinliğe Katıldı',
    STREAK_7_DAYS: '7 Günlük Seri',
    COMMENT_POSTED: 'Yorum Yapıldı',
    CONTENT_LIKED: 'İçerik Beğenildi',
    CONTENT_SHARED: 'İçerik Paylaşıldı',
    BUSINESS_REMOVED_PENALTY: 'İşletme Silme Cezası',
    REFERRAL_COMPLETED: 'Referans Tamamlandı',
    REFERRAL_ACCEPTED: 'Referans Kabul Edildi',
};

const label = (reason: string, actionLabel?: string | null) =>
    actionLabel || REASON_LABELS[reason] || reason.replace(/_/g, ' ');

const ReasonIcon = ({ reason, size = 20 }: { reason: string; size?: number }) => {
    const sx = { fontSize: size };
    if (reason.includes('EVENT')) return <EventIcon sx={sx} />;
    if (reason.includes('BUSINESS')) return <BusinessIcon sx={sx} />;
    if (reason.includes('PROFILE')) return <ProfileIcon sx={sx} />;
    if (reason.includes('STREAK')) return <StreakIcon sx={sx} />;
    if (reason.includes('COMMENT')) return <CommentIcon sx={sx} />;
    if (reason.includes('LIKED')) return <LikeIcon sx={sx} />;
    if (reason.includes('SHARED')) return <ShareIcon sx={sx} />;
    if (reason.includes('REFERRAL')) return <ReferralIcon sx={sx} />;
    if (reason.includes('BULLETIN')) return <BulletinIcon sx={sx} />;
    if (reason.includes('PENALTY')) return <PenaltyIcon sx={sx} />;
    if (reason.includes('CLAIM')) return <TrophyIcon sx={sx} />;
    return <StarIcon sx={sx} />;
};

const reasonColor = (reason: string, points: number) => {
    if (points < 0 || reason.includes('PENALTY')) return '#ef4444';
    if (reason.includes('STREAK')) return '#f97316';
    if (reason.includes('REFERRAL')) return '#8b5cf6';
    if (reason.includes('EVENT')) return '#3b82f6';
    return '#10b981';
};

// ── Helpers ────────────────────────────────────────────────────────────────

const fmt = (v: string) =>
    new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(v));

const extractError = (e: any, fallback: string) =>
    e?.response?.data?.message || e?.message || fallback;

// ── Props ──────────────────────────────────────────────────────────────────

interface Props {
    userId: string;
    totalPoints?: number;
    totalBadges?: number;
    onRewardsChanged?: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function UserGamificationRewardsPanel({
    userId, totalPoints = 0, totalBadges = 0, onRewardsChanged,
}: Props) {
    const theme = useTheme();
    const { enqueueSnackbar } = useSnackbar();

    const [page, setPage] = useState(1);
    const [pageSize] = useState(15);
    const [reasonFilter, setReasonFilter] = useState('');
    const [rewardsPage, setRewardsPage] = useState<AdminUserGamificationRewardsPage | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [detailOpen, setDetailOpen] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detail, setDetail] = useState<AdminUserGamificationRewardDetailDto | null>(null);

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<AdminUserGamificationRewardItemDto | null>(null);
    const [deleting, setDeleting] = useState(false);

    const fetchRewards = useCallback(async (p = page, reason = reasonFilter) => {
        if (!userId) return;
        setLoading(true);
        setError(null);
        try {
            const res = await userService.getUserGamificationRewards(userId, {
                reason: reason || undefined,
                page: p - 1,
                size: pageSize,
            });
            setRewardsPage(res.data);
        } catch (e: any) {
            setError(extractError(e, 'Ödül geçmişi yüklenemedi.'));
        } finally {
            setLoading(false);
        }
    }, [userId, page, reasonFilter, pageSize]);

    useEffect(() => { fetchRewards(); }, [fetchRewards]);

    const openDetail = async (rewardId: string) => {
        setDetailOpen(true);
        setDetailLoading(true);
        setDetail(null);
        try {
            const res = await userService.getUserGamificationRewardDetail(userId, rewardId);
            setDetail(res.data);
        } catch (e: any) {
            enqueueSnackbar(extractError(e, 'Detay yüklenemedi'), { variant: 'error' });
            setDetailOpen(false);
        } finally {
            setDetailLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await userService.deleteUserGamificationReward(userId, deleteTarget.rewardId);
            enqueueSnackbar('Ödül kaydı silindi. Puan geri alındı.', { variant: 'success' });
            setConfirmOpen(false);
            setDeleteTarget(null);
            if (detail?.rewardId === deleteTarget.rewardId) setDetailOpen(false);
            await fetchRewards();
            onRewardsChanged?.();
        } catch (e: any) {
            enqueueSnackbar(extractError(e, 'Silinemedi'), { variant: 'error' });
        } finally {
            setDeleting(false);
        }
    };

    const items = rewardsPage?.content ?? [];

    // ── Category breakdown for summary ────────────────────────────
    const byCategory = items.reduce<Record<string, number>>((acc, r) => {
        const cat = r.category || 'DİĞER';
        acc[cat] = (acc[cat] ?? 0) + (r.points > 0 ? r.points : 0);
        return acc;
    }, {});
    const totalEarned = items.filter(r => r.points > 0).reduce((s, r) => s + r.points, 0);
    const totalPenalty = items.filter(r => r.points < 0).reduce((s, r) => s + r.points, 0);

    return (
        <>
            {/* ── Summary header ──────────────────────────────────── */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={3} flexWrap="wrap">
                {/* Total XP */}
                <Paper
                    variant="outlined"
                    sx={{
                        px: 3, py: 2, borderRadius: 3, flex: 1, minWidth: 160,
                        background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.08)}, ${alpha(theme.palette.warning.light, 0.04)})`,
                        border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                    }}
                >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar sx={{ bgcolor: alpha(theme.palette.warning.main, 0.15), color: 'warning.main', width: 44, height: 44, borderRadius: 2 }}>
                            <StarIcon />
                        </Avatar>
                        <Box>
                            <Typography variant="h5" fontWeight={800} color="warning.main">
                                {totalPoints.toLocaleString('tr-TR')}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">Toplam XP</Typography>
                        </Box>
                    </Stack>
                </Paper>

                {/* Badges */}
                <Paper
                    variant="outlined"
                    sx={{
                        px: 3, py: 2, borderRadius: 3, flex: 1, minWidth: 140,
                        background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.08)}, ${alpha(theme.palette.success.light, 0.04)})`,
                        border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                    }}
                >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar sx={{ bgcolor: alpha(theme.palette.success.main, 0.15), color: 'success.main', width: 44, height: 44, borderRadius: 2 }}>
                            <TrophyIcon />
                        </Avatar>
                        <Box>
                            <Typography variant="h5" fontWeight={800} color="success.main">
                                {totalBadges}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">Rozet</Typography>
                        </Box>
                    </Stack>
                </Paper>

                {/* Page summary */}
                {rewardsPage && (
                    <Paper
                        variant="outlined"
                        sx={{ px: 3, py: 2, borderRadius: 3, flex: 2, minWidth: 200 }}
                    >
                        <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>Bu sayfada</Typography>
                        <Stack direction="row" spacing={2}>
                            <Box>
                                <Typography variant="body2" fontWeight={700} color="success.main">+{totalEarned} XP</Typography>
                                <Typography variant="caption" color="text.disabled">kazanılan</Typography>
                            </Box>
                            {totalPenalty < 0 && (
                                <Box>
                                    <Typography variant="body2" fontWeight={700} color="error.main">{totalPenalty} XP</Typography>
                                    <Typography variant="caption" color="text.disabled">ceza</Typography>
                                </Box>
                            )}
                            <Box>
                                <Typography variant="body2" fontWeight={700}>{rewardsPage.totalElements}</Typography>
                                <Typography variant="caption" color="text.disabled">toplam kayıt</Typography>
                            </Box>
                        </Stack>
                    </Paper>
                )}
            </Stack>

            {/* ── Filter row ──────────────────────────────────────── */}
            <Stack direction="row" spacing={1.5} mb={2} alignItems="center">
                <FilterIcon fontSize="small" color="action" />
                <TextField
                    size="small"
                    label="Neden filtrele"
                    value={reasonFilter}
                    onChange={e => setReasonFilter(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { setPage(1); fetchRewards(1, reasonFilter); } }}
                    sx={{ width: 200 }}
                    select
                >
                    <MenuItem value="">Tümü</MenuItem>
                    {Object.entries(REASON_LABELS).map(([k, v]) => (
                        <MenuItem key={k} value={k}>{v}</MenuItem>
                    ))}
                </TextField>
                <Button size="small" variant="outlined" onClick={() => { setPage(1); fetchRewards(1, reasonFilter); }}>
                    Uygula
                </Button>
                {reasonFilter && (
                    <Button size="small" onClick={() => { setReasonFilter(''); setPage(1); fetchRewards(1, ''); }}>
                        Temizle
                    </Button>
                )}
                <Box flex={1} />
                <IconButton size="small" onClick={() => fetchRewards()} disabled={loading}>
                    <RefreshIcon fontSize="small" />
                </IconButton>
            </Stack>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {loading && <LinearProgress sx={{ mb: 2, borderRadius: 4 }} />}

            {/* ── XP Timeline ─────────────────────────────────────── */}
            {!loading && items.length === 0 && (
                <Box textAlign="center" py={6}>
                    <StarIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1.5 }} />
                    <Typography color="text.secondary">Henüz XP kaydı yok.</Typography>
                </Box>
            )}

            <Stack spacing={0}>
                {items.map((item, idx) => {
                    const color = reasonColor(item.reason, item.points);
                    const isLast = idx === items.length - 1;
                    return (
                        <Box key={item.rewardId} display="flex">
                            {/* Timeline line */}
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mr: 2, mt: 0.5 }}>
                                <Avatar
                                    sx={{
                                        width: 36, height: 36, borderRadius: 2,
                                        bgcolor: alpha(color, 0.15),
                                        color,
                                        flexShrink: 0,
                                    }}
                                >
                                    <ReasonIcon reason={item.reason} size={18} />
                                </Avatar>
                                {!isLast && (
                                    <Box sx={{ width: 2, flex: 1, bgcolor: 'divider', my: 0.5, minHeight: 16 }} />
                                )}
                            </Box>

                            {/* Content */}
                            <Paper
                                variant="outlined"
                                onClick={() => openDetail(item.rewardId)}
                                sx={{
                                    flex: 1,
                                    mb: 1,
                                    px: 2,
                                    py: 1.5,
                                    borderRadius: 2.5,
                                    cursor: 'pointer',
                                    borderColor: alpha(color, 0.15),
                                    transition: 'all 0.15s',
                                    '&:hover': {
                                        borderColor: alpha(color, 0.35),
                                        boxShadow: `0 2px 8px ${alpha(color, 0.12)}`,
                                    },
                                }}
                            >
                                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                    <Box flex={1} minWidth={0}>
                                        <Stack direction="row" spacing={1} alignItems="center" mb={0.25} flexWrap="wrap">
                                            <Typography variant="body2" fontWeight={700} noWrap>
                                                {label(item.reason, item.actionLabel)}
                                            </Typography>
                                            {item.category && (
                                                <Chip
                                                    label={item.category}
                                                    size="small"
                                                    sx={{
                                                        height: 18, fontSize: 10,
                                                        bgcolor: item.category === 'PENALTY' ? alpha('#ef4444', 0.1) : alpha('#10b981', 0.1),
                                                        color: item.category === 'PENALTY' ? 'error.main' : 'success.main',
                                                    }}
                                                />
                                            )}
                                        </Stack>

                                        {item.descriptionSummary && (
                                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.25 }}>
                                                {item.descriptionSummary}
                                            </Typography>
                                        )}

                                        <Stack direction="row" spacing={1} flexWrap="wrap" mt={0.25}>
                                            {item.businessName && (
                                                <Chip
                                                    label={item.businessName}
                                                    size="small"
                                                    icon={<BusinessIcon sx={{ fontSize: '12px !important' }} />}
                                                    variant="outlined"
                                                    sx={{ height: 20, fontSize: 11 }}
                                                />
                                            )}
                                            {item.referenceName && (
                                                <Typography variant="caption" color="text.secondary">
                                                    Ref: {item.referenceName}
                                                </Typography>
                                            )}
                                        </Stack>
                                    </Box>

                                    {/* Right side */}
                                    <Stack alignItems="flex-end" spacing={0.5} ml={1.5} flexShrink={0}>
                                        <Chip
                                            label={`${item.points > 0 ? '+' : ''}${item.points} XP`}
                                            size="small"
                                            sx={{
                                                fontWeight: 800,
                                                fontSize: 12,
                                                bgcolor: alpha(color, 0.12),
                                                color,
                                            }}
                                        />
                                        <Typography variant="caption" color="text.disabled" sx={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                                            {fmt(item.createdAt)}
                                        </Typography>
                                        <Tooltip title="Sil">
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={(e) => { e.stopPropagation(); setDeleteTarget(item); setConfirmOpen(true); }}
                                                sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }}
                                            >
                                                <DeleteIcon sx={{ fontSize: 16 }} />
                                            </IconButton>
                                        </Tooltip>
                                    </Stack>
                                </Stack>
                            </Paper>
                        </Box>
                    );
                })}
            </Stack>

            {/* ── Pagination ───────────────────────────────────────── */}
            {(rewardsPage?.totalPages ?? 0) > 1 && (
                <Box display="flex" justifyContent="center" mt={2}>
                    <Pagination
                        count={rewardsPage!.totalPages}
                        page={page}
                        onChange={(_, p) => { setPage(p); fetchRewards(p); }}
                        color="primary"
                        size="small"
                        showFirstButton
                        showLastButton
                    />
                </Box>
            )}

            {/* ── Detail Dialog ─────────────────────────────────────── */}
            <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
                <DialogTitle sx={{ fontWeight: 700 }}>XP Ödül Detayı</DialogTitle>
                <DialogContent dividers>
                    {detailLoading ? (
                        <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
                    ) : !detail ? (
                        <Typography color="text.secondary">Detay bulunamadı.</Typography>
                    ) : (
                        <Stack spacing={2.5}>
                            {/* Points badge */}
                            <Box textAlign="center" py={1}>
                                <Chip
                                    label={`${detail.points > 0 ? '+' : ''}${detail.points} XP`}
                                    sx={{
                                        fontSize: 22, fontWeight: 800, height: 44, px: 2,
                                        bgcolor: alpha(reasonColor(detail.reason, detail.points), 0.12),
                                        color: reasonColor(detail.reason, detail.points),
                                    }}
                                />
                                <Typography variant="h6" fontWeight={700} mt={1}>
                                    {label(detail.reason, detail.actionLabel)}
                                </Typography>
                                {detail.category && (
                                    <Chip label={detail.category} size="small" variant="outlined" sx={{ mt: 0.5 }} />
                                )}
                            </Box>

                            <Divider />

                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <Typography variant="caption" color="text.secondary">Tarih</Typography>
                                    <Typography variant="body2" fontWeight={600}>{fmt(detail.createdAt)}</Typography>
                                </Grid>
                                {detail.businessName && (
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary">İşletme</Typography>
                                        <Typography variant="body2" fontWeight={600}>{detail.businessName}</Typography>
                                    </Grid>
                                )}
                                {detail.referenceName && (
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary">Referans</Typography>
                                        <Typography variant="body2" fontWeight={600}>{detail.referenceName}</Typography>
                                    </Grid>
                                )}
                                {detail.referenceType && (
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary">Referans Türü</Typography>
                                        <Typography variant="body2" fontWeight={600}>{detail.referenceType}</Typography>
                                    </Grid>
                                )}
                            </Grid>

                            {detail.descriptionSummary && (
                                <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}>
                                    <Typography variant="body2" color="text.secondary" fontStyle="italic">
                                        "{detail.descriptionSummary}"
                                    </Typography>
                                </Box>
                            )}

                            {detail.metadata && (
                                <>
                                    <Divider />
                                    <Box>
                                        <Stack direction="row" spacing={0.5} alignItems="center" mb={0.5}>
                                            <InfoIcon fontSize="small" color="action" />
                                            <Typography variant="caption" color="text.secondary">Metadata</Typography>
                                        </Stack>
                                        <Box
                                            component="pre"
                                            sx={{
                                                p: 1.5, borderRadius: 1.5, fontSize: 11,
                                                bgcolor: '#1e1e1e', color: '#e0e0e0',
                                                overflowX: 'auto', maxHeight: 160,
                                            }}
                                        >
                                            {(() => { try { return JSON.stringify(JSON.parse(detail.metadata!), null, 2); } catch { return detail.metadata; } })()}
                                        </Box>
                                    </Box>
                                </>
                            )}
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDetailOpen(false)}>Kapat</Button>
                    {detail && (
                        <Button
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={() => {
                                const item = rewardsPage?.content.find(r => r.rewardId === detail.rewardId);
                                if (item) { setDeleteTarget(item); setConfirmOpen(true); }
                            }}
                        >
                            Sil ve Puanı Geri Al
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            {/* ── Delete Confirm ────────────────────────────────────── */}
            <ConfirmDialog
                open={confirmOpen}
                onClose={() => !deleting && (setConfirmOpen(false), setDeleteTarget(null))}
                onConfirm={handleDelete}
                title="XP Kaydını Sil"
                message="Bu kayıt silinirse kullanıcının XP'si geri alınır. Devam etmek istiyor musunuz?"
                confirmText="Sil ve Geri Al"
                cancelText="Vazgeç"
                severity="warning"
                loading={deleting}
            />
        </>
    );
}
