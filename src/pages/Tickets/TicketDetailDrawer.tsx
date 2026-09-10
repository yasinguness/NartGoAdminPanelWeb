/**
 * TicketDetailDrawer — Bilet detay drawer (sağdan açılan panel)
 * QR kod, sahip bilgileri, check-in durumu, iptal/iade butonları
 */
import { useState } from 'react';
import {
  Drawer, Box, Typography, Stack, IconButton, Chip, Divider, Button,
  Avatar, Paper, alpha, CircularProgress, TextField,
  Tooltip,
} from '@mui/material';
import {
  Close as CloseIcon, ContentCopy as CopyIcon,
  Cancel as CancelIcon, Replay as RefundIcon,
  CheckCircle as CheckIcon, Warning as WarningIcon,
  EventSeat as SeatIcon, Person as PersonIcon,
  ConfirmationNumber as TicketIcon, Receipt as OrderIcon,
  SwapHoriz as TransferIcon,
} from '@mui/icons-material';
import { TicketStatus } from '../../types/tickets/ticketTypes';
import { formatEventDateTime, eventZoneLabel } from '../../utils/dateUtils';
import type { TicketListItem, TicketTransferRecord, TicketTransferConfig } from '../../types/tickets/ticketManagementTypes';
import type { OrderDetailResponse } from '../../types/tickets/ticketManagementTypes';

interface TicketDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  ticket: TicketListItem | null;
  order?: OrderDetailResponse | null;
  transferHistory?: TicketTransferRecord[];
  transferConfig?: TicketTransferConfig;
  onCancel?: (ticketId: string, reason: string) => void;
  onRefund?: (ticketId: string, reason: string) => void;
  cancelLoading?: boolean;
  refundLoading?: boolean;
}

const STATUS_CONFIG: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  CREATED: { color: '#6b7280', label: 'Oluşturuldu', icon: <TicketIcon fontSize="small" /> },
  RESERVED: { color: '#f59e0b', label: 'Rezerve', icon: <WarningIcon fontSize="small" /> },
  ACTIVE: { color: '#22c55e', label: 'Aktif', icon: <CheckIcon fontSize="small" /> },
  USED: { color: '#3b82f6', label: 'Kullanıldı', icon: <CheckIcon fontSize="small" /> },
  CHECKED_IN: { color: '#8b5cf6', label: 'Giriş Yapıldı', icon: <CheckIcon fontSize="small" /> },
  CANCELLED: { color: '#ef4444', label: 'İptal', icon: <CancelIcon fontSize="small" /> },
  REFUNDED: { color: '#f97316', label: 'İade Edildi', icon: <RefundIcon fontSize="small" /> },
};

export default function TicketDetailDrawer({
  open, onClose, ticket, order, transferHistory, transferConfig, onCancel, onRefund, cancelLoading, refundLoading,
}: TicketDetailDrawerProps) {
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [showRefundForm, setShowRefundForm] = useState(false);

  if (!ticket) return null;

  const statusCfg = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.CREATED;
  const canCancel = ticket.status === TicketStatus.ACTIVE || ticket.status === TicketStatus.RESERVED;
  const canRefund = ticket.canBeRefunded;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: 420, p: 0 } }}>
      {/* Header */}
      <Box sx={{ px: 3, py: 2.5, bgcolor: alpha(statusCfg.color, 0.06), borderBottom: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              <Typography variant="h6" fontWeight={800}>Bilet Detay</Typography>
              <Chip
                label={statusCfg.label}
                size="small"
                sx={{
                  height: 24, fontWeight: 700, fontSize: 11,
                  bgcolor: alpha(statusCfg.color, 0.12),
                  color: statusCfg.color,
                  border: `1px solid ${alpha(statusCfg.color, 0.3)}`,
                }}
              />
            </Stack>
            {ticket.serialNo && (
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Typography variant="caption" color="text.secondary" fontFamily="monospace">
                  #{ticket.serialNo}
                </Typography>
                <Tooltip title="Kopyala">
                  <IconButton size="small" onClick={() => copyToClipboard(ticket.serialNo || '')}>
                    <CopyIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              </Stack>
            )}
          </Box>
          <IconButton onClick={onClose}><CloseIcon /></IconButton>
        </Stack>
      </Box>

      <Box sx={{ px: 3, py: 2.5, overflow: 'auto', flex: 1 }}>
        {/* Etkinlik Bilgisi */}
        {ticket.eventName && (
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', mb: 2.5 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar src={ticket.eventImageUrl} variant="rounded"
                sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: 'grey.100' }}>
                🎫
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" fontWeight={700}>{ticket.eventName}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {ticket.eventStartDate ? formatEventDateTime(ticket.eventStartDate, ticket.eventTimeZone, {
                    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                  }) + (ticket.eventTimeZone ? ` (${eventZoneLabel(ticket.eventTimeZone)})` : '') : '—'}
                </Typography>
                {ticket.eventLocation && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    📍 {ticket.eventLocation}
                  </Typography>
                )}
              </Box>
            </Stack>
          </Paper>
        )}

        {/* QR Kod */}
        {ticket.qrCodeImage && (
          <Box sx={{ textAlign: 'center', mb: 2.5 }}>
            <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', display: 'inline-block' }}>
              <Box
                component="img"
                src={ticket.qrCodeImage.startsWith('data:') ? ticket.qrCodeImage : `data:image/png;base64,${ticket.qrCodeImage}`}
                alt="QR Code"
                sx={{ width: 180, height: 180, display: 'block' }}
              />
            </Paper>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
              {ticket.isCheckedIn ? '✅ Check-in yapıldı' : '📱 Kapıda taratılacak QR kod'}
            </Typography>
          </Box>
        )}

        <Divider sx={{ mb: 2 }} />

        {/* Bilet Bilgileri */}
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
          <TicketIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} /> Bilet Bilgileri
        </Typography>

        <Stack spacing={1} sx={{ mb: 2.5 }}>
          {[
            { label: 'Bilet Türü', value: ticket.ticketTypeName || '—' },
            { label: 'Bilet ID', value: ticket.id?.slice(0, 12) || '—', mono: true },
            { label: 'Sipariş ID', value: ticket.orderId?.slice(0, 12) || '—', mono: true },
            { label: 'Durum', value: statusCfg.label },
            { label: 'Oluşturulma', value: ticket.issuedAt ? new Date(ticket.issuedAt).toLocaleString('tr-TR') : '—' },
            { label: 'Fiyat', value: ticket.eventPrice ? `${ticket.eventCurrency || '₺'}${ticket.eventPrice}` : 'Ücretsiz' },
          ].map((row, i) => (
            <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
              <Typography variant="body2" color="text.secondary">{row.label}</Typography>
              <Typography variant="body2" fontWeight={600} sx={row.mono ? { fontFamily: 'monospace', fontSize: 12 } : undefined}>
                {row.value}
              </Typography>
            </Box>
          ))}
        </Stack>

        <Divider sx={{ mb: 2 }} />

        {/* Sahip Bilgileri */}
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
          <PersonIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} /> Bilet Sahibi
        </Typography>

        <Stack spacing={1} sx={{ mb: 2.5 }}>
          {[
            { label: 'E-posta', value: ticket.userEmail || '—' },
            { label: 'Ad', value: ticket.userName || '—' },
            { label: 'Telefon', value: ticket.userPhone || '—' },
          ].map((row, i) => (
            <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
              <Typography variant="body2" color="text.secondary">{row.label}</Typography>
              <Typography variant="body2" fontWeight={600}>{row.value}</Typography>
            </Box>
          ))}
        </Stack>

        {/* Koltuk Bilgisi */}
        {ticket.seatInfo && (
          <>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
              <SeatIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} /> Koltuk
            </Typography>
            <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2, bgcolor: 'grey.50', border: '1px solid', borderColor: 'divider' }}>
              <Stack direction="row" spacing={2}>
                {ticket.seatInfo.sectionName && (
                  <Box><Typography variant="caption" color="text.secondary">Bölüm</Typography><Typography variant="body2" fontWeight={700}>{ticket.seatInfo.sectionName}</Typography></Box>
                )}
                {ticket.seatInfo.rowLabel && (
                  <Box><Typography variant="caption" color="text.secondary">Sıra</Typography><Typography variant="body2" fontWeight={700}>{ticket.seatInfo.rowLabel}</Typography></Box>
                )}
                {ticket.seatInfo.seatNumber && (
                  <Box><Typography variant="caption" color="text.secondary">Koltuk</Typography><Typography variant="body2" fontWeight={700}>{ticket.seatInfo.seatNumber}</Typography></Box>
                )}
              </Stack>
            </Paper>
          </>
        )}

        {/* Sipariş Bilgisi */}
        {order && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
              <OrderIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} /> Sipariş
            </Typography>
            <Stack spacing={1} sx={{ mb: 2 }}>
              {[
                { label: 'Tutar', value: `${order.currency || '₺'}${order.totalAmount?.toLocaleString('tr-TR') || '0'}` },
                { label: 'Durum', value: order.status },
                { label: 'Ödeme', value: order.paidAt ? new Date(order.paidAt).toLocaleString('tr-TR') : 'Beklemede' },
                { label: 'Bilet Sayısı', value: String(order.tickets?.length || order.items?.reduce((s, i) => s + i.quantity, 0) || '—') },
              ].map((row, i) => (
                <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">{row.label}</Typography>
                  <Typography variant="body2" fontWeight={600}>{row.value}</Typography>
                </Box>
              ))}
            </Stack>
          </>
        )}

        {/* Transfer Geçmişi & Bilgisi */}
        {(transferHistory?.length || transferConfig) && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
              <TransferIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} /> Transfer
            </Typography>

            {/* Transfer konfigürasyonu */}
            {transferConfig && (
              <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2, bgcolor: 'grey.50', border: '1px solid', borderColor: 'divider', mb: 1.5 }}>
                <Stack spacing={0.5}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">Transfer izni</Typography>
                    <Chip label={transferConfig.isTransferable ? 'Açık' : 'Kapalı'} size="small"
                      color={transferConfig.isTransferable ? 'success' : 'default'}
                      sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700 }} />
                  </Box>
                  {transferConfig.isTransferable && (
                    <>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" color="text.secondary">Transfer hakkı</Typography>
                        <Typography variant="caption" fontWeight={700}>
                          {transferConfig.currentTransferCount} / {transferConfig.maxTransferCount}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" color="text.secondary">Kapanış süresi</Typography>
                        <Typography variant="caption" fontWeight={700}>
                          Etkinlikten {transferConfig.transferDeadlineHours} saat önce
                        </Typography>
                      </Box>
                      {transferConfig.requiresApproval && (
                        <Chip label="Admin onayı gerekli" size="small" color="warning" variant="outlined"
                          sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700, alignSelf: 'flex-start' }} />
                      )}
                    </>
                  )}
                </Stack>
              </Paper>
            )}

            {/* Transfer geçmişi */}
            {transferHistory && transferHistory.length > 0 ? (
              <Stack spacing={1}>
                {transferHistory.map((tr, i) => (
                  <Paper key={tr.id || i} elevation={0}
                    sx={{ p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: alpha('#f97316', 0.03) }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                      <TransferIcon sx={{ fontSize: 14, color: '#f97316' }} />
                      <Typography variant="caption" fontWeight={700}>
                        {tr.fromName || tr.fromEmail} → {tr.toName || tr.toEmail}
                      </Typography>
                      <Chip label={tr.status === 'COMPLETED' ? 'Tamamlandı' : tr.status === 'PENDING' ? 'Bekliyor' : 'Reddedildi'}
                        size="small"
                        color={tr.status === 'COMPLETED' ? 'success' : tr.status === 'PENDING' ? 'warning' : 'error'}
                        sx={{ height: 16, fontSize: '0.55rem', fontWeight: 700, ml: 'auto' }} />
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                      {new Date(tr.transferredAt).toLocaleString('tr-TR')}
                    </Typography>
                  </Paper>
                ))}
              </Stack>
            ) : (
              <Typography variant="caption" color="text.disabled">Transfer geçmişi yok</Typography>
            )}
          </>
        )}
      </Box>

      {/* Footer Actions */}
      {(canCancel || canRefund) && (
        <Box sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'grey.50' }}>
          {/* Cancel Form */}
          {showCancelForm && (
            <Box sx={{ mb: 2 }}>
              <TextField fullWidth size="small" label="İptal sebebi" value={cancelReason}
                onChange={e => setCancelReason(e.target.value)} sx={{ mb: 1 }} />
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button size="small" onClick={() => setShowCancelForm(false)} sx={{ textTransform: 'none' }}>Vazgeç</Button>
                <Button size="small" variant="contained" color="error"
                  onClick={() => { if (!cancelReason.trim()) return; onCancel?.(ticket.id, cancelReason); setShowCancelForm(false); setCancelReason(''); }}
                  disabled={cancelLoading || !cancelReason.trim()}
                  sx={{ textTransform: 'none' }}>
                  {cancelLoading ? <CircularProgress size={16} /> : 'İptal Et'}
                </Button>
              </Stack>
            </Box>
          )}

          {/* Refund Form */}
          {showRefundForm && (
            <Box sx={{ mb: 2 }}>
              <TextField fullWidth size="small" label="İade sebebi" value={cancelReason}
                onChange={e => setCancelReason(e.target.value)} sx={{ mb: 1 }} />
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button size="small" onClick={() => setShowRefundForm(false)} sx={{ textTransform: 'none' }}>Vazgeç</Button>
                <Button size="small" variant="contained" color="warning"
                  onClick={() => { if (!cancelReason.trim()) return; onRefund?.(ticket.id, cancelReason); setShowRefundForm(false); setCancelReason(''); }}
                  disabled={refundLoading}
                  sx={{ textTransform: 'none' }}>
                  {refundLoading ? <CircularProgress size={16} /> : 'İade Et'}
                </Button>
              </Stack>
            </Box>
          )}

          {!showCancelForm && !showRefundForm && (
            <Stack direction="row" spacing={1}>
              {canCancel && (
                <Button fullWidth variant="outlined" color="error" size="small"
                  startIcon={<CancelIcon />}
                  onClick={() => setShowCancelForm(true)}
                  sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}>
                  İptal Et
                </Button>
              )}
              {canRefund && (
                <Button fullWidth variant="outlined" color="warning" size="small"
                  startIcon={<RefundIcon />}
                  onClick={() => setShowRefundForm(true)}
                  sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}>
                  İade Et
                </Button>
              )}
            </Stack>
          )}
        </Box>
      )}
    </Drawer>
  );
}
