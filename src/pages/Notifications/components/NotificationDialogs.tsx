import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Box,
    Typography,
    Grid,
    Alert,
    Switch,
    FormControlLabel,
    Chip,
    Divider,
    Card,
    Stack,
    IconButton,
} from '@mui/material';
import {
    Notifications as NotificationsIcon,
    Email as EmailIcon,
    Close as CloseIcon,
} from '@mui/icons-material';
import { 
    NotificationDto, 
    NotificationPriority, 
    NotificationType,
    NotificationTemplate,
    EmailMessage
} from '../../../types/notifications/notificationModel';
import { AdminBulkNotificationRequest, RecipientType } from '../../../types/notifications/adminBulkNotificationRequest';
import { FormSection, FormGrid } from '../../../components/Form';

interface PriorityScenario {
    priority: NotificationPriority;
    title: string;
    scenarios: string[];
    behaviors: {
        delayTolerance: string;
        sound: string;
        vibration: string;
        ui: string;
        email: string;
        retry: string;
        push?: string;
        override?: string;
    };
    icon: React.ReactNode;
    color: string;
}

interface NotificationDialogsProps {
    // Basic Notification Dialog
    openDialog: boolean;
    selectedNotification: NotificationDto | null;
    formData: Partial<NotificationDto>;
    setFormData: (data: Partial<NotificationDto>) => void;
    handleCloseDialog: () => void;
    handleSubmit: () => void;

    // Email Dialog
    openEmailDialog: boolean;
    emailData: Partial<EmailMessage>;
    setEmailData: (data: Partial<EmailMessage>) => void;
    handleCloseEmailDialog: () => void;
    handleSendEmail: () => void;

    // Admin Dialog
    openAdminDialog: boolean;
    adminFormData: Partial<AdminBulkNotificationRequest>;
    setAdminFormData: (data: Partial<AdminBulkNotificationRequest>) => void;
    selectedTemplate: NotificationTemplate | '';
    setSelectedTemplate: (template: NotificationTemplate | '') => void;
    additionalFormData: any;
    setAdditionalFormData: (data: any) => void;
    useUrlEndpoint: boolean;
    setUseUrlEndpoint: (use: boolean) => void;
    handleCloseAdminDialog: () => void;
    handleAdminSubmit: (action: string) => void;
    renderTemplateFields: () => React.ReactNode;

    // Priority Scenario Dialog
    showPriorityInfo: boolean;
    setShowPriorityInfo: (show: boolean) => void;
    selectedPriorityScenario: PriorityScenario | null;
}

export default function NotificationDialogs({
    // Basic Dialog props
    openDialog,
    selectedNotification,
    formData,
    setFormData,
    handleCloseDialog,
    handleSubmit,

    // Email Dialog props
    openEmailDialog,
    emailData,
    setEmailData,
    handleCloseEmailDialog,
    handleSendEmail,

    // Admin Dialog props
    openAdminDialog,
    adminFormData,
    setAdminFormData,
    selectedTemplate,
    setSelectedTemplate,
    additionalFormData,
    setAdditionalFormData,
    useUrlEndpoint,
    setUseUrlEndpoint,
    handleCloseAdminDialog,
    handleAdminSubmit,
    renderTemplateFields,

    // Priority Scenario props
    showPriorityInfo,
    setShowPriorityInfo,
    selectedPriorityScenario
}: NotificationDialogsProps) {
    return (
        <>
            {/* Basic Notification Dialog */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={2} alignItems="center">
                            <NotificationsIcon color="primary" />
                            <Typography variant="h6" fontWeight={600}>
                                {selectedNotification ? 'Edit Notification' : 'Create New Notification'}
                            </Typography>
                        </Stack>
                        <IconButton onClick={handleCloseDialog} size="small">
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Stack>
                </DialogTitle>
                <DialogContent dividers sx={{ p: 4 }}>
                    <FormSection title="Notification Details">
                        <FormGrid>
                            <TextField
                                fullWidth
                                label="Title"
                                value={formData.title || ''}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                required
                            />
                            <FormControl fullWidth>
                                <InputLabel>Priority</InputLabel>
                                <Select
                                    value={formData.priority || NotificationPriority.NORMAL}
                                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as NotificationPriority })}
                                    label="Priority"
                                >
                                    <MenuItem value={NotificationPriority.LOW}>Low</MenuItem>
                                    <MenuItem value={NotificationPriority.NORMAL}>Normal</MenuItem>
                                    <MenuItem value={NotificationPriority.HIGH}>High</MenuItem>
                                    <MenuItem value={NotificationPriority.URGENT}>Urgent</MenuItem>
                                </Select>
                            </FormControl>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Content"
                                    value={formData.content || ''}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    multiline
                                    rows={4}
                                    required
                                />
                            </Grid>
                        </FormGrid>
                    </FormSection>
                </DialogContent>
                <DialogActions sx={{ p: 3, px: 4 }}>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained" sx={{ minWidth: 100 }}>
                        {selectedNotification ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Email Dialog */}
            <Dialog open={openEmailDialog} onClose={handleCloseEmailDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={2} alignItems="center">
                            <EmailIcon color="primary" />
                            <Typography variant="h6" fontWeight={600}>Send Email Notification</Typography>
                        </Stack>
                        <IconButton onClick={handleCloseEmailDialog} size="small">
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Stack>
                </DialogTitle>
                <DialogContent dividers sx={{ p: 4 }}>
                    <Stack spacing={4}>
                        <FormSection title="Recipient & Subject">
                            <FormGrid>
                                <TextField
                                    fullWidth
                                    label="To Email"
                                    type="email"
                                    value={emailData.to || ''}
                                    onChange={(e) => setEmailData({ ...emailData, to: e.target.value })}
                                    required
                                />
                                <TextField
                                    fullWidth
                                    label="Subject"
                                    value={emailData.subject || ''}
                                    onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                                    required
                                />
                            </FormGrid>
                        </FormSection>
                        <FormSection title="Template Content">
                            <FormGrid>
                                <TextField
                                    fullWidth
                                    label="Template Name"
                                    value={emailData.templateName || ''}
                                    onChange={(e) => setEmailData({ ...emailData, templateName: e.target.value })}
                                    placeholder="email-template-name"
                                />
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Template Variables (JSON)"
                                        value={JSON.stringify(emailData.templateVariables || {}, null, 2)}
                                        onChange={(e) => {
                                            try {
                                                setEmailData({
                                                    ...emailData,
                                                    templateVariables: JSON.parse(e.target.value)
                                                });
                                            } catch (error) {
                                                console.error('Invalid JSON:', error);
                                            }
                                        }}
                                        multiline
                                        rows={6}
                                        placeholder='{"message": "Your email content here", "userName": "John Doe"}'
                                        helperText="Enter JSON object with template variables"
                                    />
                                </Grid>
                            </FormGrid>
                        </FormSection>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 3, px: 4 }}>
                    <Button onClick={handleCloseEmailDialog}>Cancel</Button>
                    <Button onClick={handleSendEmail} variant="contained" sx={{ minWidth: 100 }}>
                        Send
                    </Button> 
                </DialogActions>
            </Dialog>

            {/* Priority Scenario Info Dialog */}
            <Dialog 
                open={showPriorityInfo} 
                onClose={() => setShowPriorityInfo(false)} 
                maxWidth="md" 
                fullWidth
            >
                <DialogTitle>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={2} alignItems="center">
                            {selectedPriorityScenario?.icon}
                            <Typography variant="h6" fontWeight={600} color={selectedPriorityScenario?.color}>
                                {selectedPriorityScenario?.title}
                            </Typography>
                        </Stack>
                        <IconButton onClick={() => setShowPriorityInfo(false)} size="small">
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Stack>
                </DialogTitle>
                <DialogContent dividers sx={{ p: 4 }}>
                    {selectedPriorityScenario && (
                        <Stack spacing={4}>
                            <Box>
                                <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ color: selectedPriorityScenario.color }}>
                                    📋 Uygun Senaryolar
                                </Typography>
                                <Stack spacing={1} sx={{ pl: 1 }}>
                                    {selectedPriorityScenario.scenarios.map((scenario, index) => (
                                        <Typography key={index} variant="body2">
                                            • {scenario}
                                        </Typography>
                                    ))}
                                </Stack>
                            </Box>

                            <Box>
                                <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ color: selectedPriorityScenario.color }}>
                                    ⚙️ Davranış Özellikleri
                                </Typography>
                                <Grid container spacing={3}>
                                    <Grid item xs={12} sm={6}>
                                        <Card variant="outlined" sx={{ p: 3, height: '100%', borderRadius: 2 }}>
                                            <Stack spacing={1.5}>
                                                <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>Delivery Details</Typography>
                                                <Typography variant="body2">{selectedPriorityScenario.behaviors.delayTolerance}</Typography>
                                                <Typography variant="body2">{selectedPriorityScenario.behaviors.sound}</Typography>
                                                <Typography variant="body2">{selectedPriorityScenario.behaviors.vibration}</Typography>
                                            </Stack>
                                        </Card>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Card variant="outlined" sx={{ p: 3, height: '100%', borderRadius: 2 }}>
                                            <Stack spacing={1.5}>
                                                <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>User Experience</Typography>
                                                <Typography variant="body2">{selectedPriorityScenario.behaviors.ui}</Typography>
                                                <Typography variant="body2">{selectedPriorityScenario.behaviors.email}</Typography>
                                                <Typography variant="body2">{selectedPriorityScenario.behaviors.retry}</Typography>
                                                {selectedPriorityScenario.behaviors.push && (
                                                    <Typography variant="body2">{selectedPriorityScenario.behaviors.push}</Typography>
                                                )}
                                                {selectedPriorityScenario.behaviors.override && (
                                                    <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 'bold' }}>
                                                        {selectedPriorityScenario.behaviors.override}
                                                    </Typography>
                                                )}
                                            </Stack>
                                        </Card>
                                    </Grid>
                                </Grid>
                            </Box>

                            <Alert severity={
                                selectedPriorityScenario.priority === NotificationPriority.URGENT ? 'error' :
                                selectedPriorityScenario.priority === NotificationPriority.HIGH ? 'warning' : 'info'
                            }>
                                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                                    💡 Öneriler
                                </Typography>
                                <Typography variant="body2">
                                    {selectedPriorityScenario.priority === NotificationPriority.LOW && 
                                        "Bu öncelik seviyesi genellikle pazarlama ve bilgilendirme amaçlı kullanılır. Kullanıcı deneyimini bozmamak için dikkatli kullanın."}
                                    {selectedPriorityScenario.priority === NotificationPriority.NORMAL && 
                                        "Günlük kullanım için ideal öncelik seviyesi. Kullanıcıların dikkatini çeker ancak rahatsız etmez."}
                                    {selectedPriorityScenario.priority === NotificationPriority.HIGH && 
                                        "Önemli işlemler ve güvenlik uyarıları için kullanın. Kullanıcının anında dikkatini çeker."}
                                    {selectedPriorityScenario.priority === NotificationPriority.URGENT && 
                                        "Sadece gerçekten acil durumlar için kullanın! Bu seviye kullanıcının tüm ayarlarını geçersiz kılar."}
                                </Typography>
                            </Alert>
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 3, px: 4 }}>
                    <Button onClick={() => setShowPriorityInfo(false)} variant="contained">
                        Anladım
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Admin Notification Dialog */}
            <Dialog open={openAdminDialog} onClose={handleCloseAdminDialog} maxWidth="lg" fullWidth>
                <DialogTitle>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={2} alignItems="center">
                            <NotificationsIcon color="primary" />
                            <Typography variant="h6" fontWeight={600}>Gelişmiş Bildirim Paneli</Typography>
                        </Stack>
                        <IconButton onClick={handleCloseAdminDialog} size="small">
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Stack>
                </DialogTitle>
                <DialogContent dividers sx={{ p: 4 }}>
                    <Stack spacing={4}>
                        <FormSection title="Şablon Seçimi">
                            <FormGrid>
                                <Grid item xs={12}>
                                    <FormControl fullWidth>
                                        <InputLabel>Bildirim Şablonu</InputLabel>
                                        <Select
                                            value={selectedTemplate}
                                            onChange={(e) => setSelectedTemplate(e.target.value as NotificationTemplate | '')}
                                            label="Bildirim Şablonu"
                                        >
                                            <MenuItem value=""><em>Özel Bildirim (Şablon Yok)</em></MenuItem>
                                            <MenuItem value={NotificationTemplate.EVENT_REMINDER}>📅 Etkinlik Hatırlatması</MenuItem>
                                            <MenuItem value={NotificationTemplate.SYSTEM_MAINTENANCE}>🔧 Sistem Bakımı</MenuItem>
                                            <MenuItem value={NotificationTemplate.PROMOTION}>🎯 Promosyon</MenuItem>
                                            <MenuItem value={NotificationTemplate.FEATURE_UPDATE}>✨ Özellik Güncellemesi</MenuItem>
                                            <MenuItem value={NotificationTemplate.URGENT_NOTIFICATION}>🚨 Acil Bildirim</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                {selectedTemplate && (
                                    <Grid item xs={12}>
                                        <Alert severity="info">
                                            <Typography variant="body2">
                                                <strong>{selectedTemplate}:</strong> 
                                                {selectedTemplate === NotificationTemplate.EVENT_REMINDER && " Detaylı bilgilerle etkinlik hatırlatmaları için mükemmel"}
                                                {selectedTemplate === NotificationTemplate.SYSTEM_MAINTENANCE && " Sistem bakımı bildirimleri için ideal"}
                                                {selectedTemplate === NotificationTemplate.PROMOTION && " Promosyon kampanyaları için harika"}
                                                {selectedTemplate === NotificationTemplate.FEATURE_UPDATE && " Yeni özellikleri duyurmak için en iyi seçenek"}
                                                {selectedTemplate === NotificationTemplate.URGENT_NOTIFICATION && " Yüksek öncelikli kritik uyarılar"}
                                            </Typography>
                                        </Alert>
                                    </Grid>
                                )}
                            </FormGrid>
                        </FormSection>

                        <FormSection title="Bildirim Bilgileri">
                            <FormGrid>
                                <TextField
                                    fullWidth
                                    label="Başlık"
                                    value={adminFormData.title || ''}
                                    onChange={(e) => setAdminFormData({ ...adminFormData, title: e.target.value })}
                                    required
                                />
                                <FormControl fullWidth>
                                    <InputLabel>Tür</InputLabel>
                                    <Select
                                        value={adminFormData.type || ''}
                                        onChange={(e) => setAdminFormData({ ...adminFormData, type: e.target.value })}
                                        label="Tür"
                                        required
                                    >
                                        <MenuItem value={NotificationType.SYSTEM}>Sistem</MenuItem>
                                        <MenuItem value={NotificationType.SYSTEM_MAINTENANCE}>Sistem Bakımı</MenuItem>
                                        <MenuItem value={NotificationType.PROMOTION}>Promosyon</MenuItem>
                                        <MenuItem value={NotificationType.ANNOUNCEMENT}>Duyuru</MenuItem>
                                        <MenuItem value={NotificationType.ALERT}>Uyarı</MenuItem>
                                        <MenuItem value={NotificationType.FEATURE_UPDATE}>Özellik Güncellemesi</MenuItem>
                                        <MenuItem value={NotificationType.EVENT_REMINDER}>Etkinlik Hatırlatması</MenuItem>
                                        <MenuItem value={NotificationType.URGENT}>Acil</MenuItem>
                                    </Select>
                                </FormControl>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="İçerik"
                                        value={adminFormData.content || ''}
                                        onChange={(e) => setAdminFormData({ ...adminFormData, content: e.target.value })}
                                        multiline
                                        rows={4}
                                        required
                                    />
                                </Grid>
                                <FormControl fullWidth>
                                    <InputLabel>Öncelik</InputLabel>
                                    <Select
                                        value={adminFormData.priority || NotificationPriority.NORMAL}
                                        onChange={(e) => setAdminFormData({ ...adminFormData, priority: e.target.value as NotificationPriority })}
                                        label="Öncelik"
                                    >
                                        <MenuItem value={NotificationPriority.LOW}>Düşük</MenuItem>
                                        <MenuItem value={NotificationPriority.NORMAL}>Normal</MenuItem>
                                        <MenuItem value={NotificationPriority.HIGH}>Yüksek</MenuItem>
                                        <MenuItem value={NotificationPriority.URGENT}>Acil</MenuItem>
                                    </Select>
                                </FormControl>
                            </FormGrid>
                        </FormSection>

                        <FormSection title="Hedef Kitle & Kanallar">
                            <FormGrid>
                                <FormControl fullWidth>
                                    <InputLabel>Alıcı Türü</InputLabel>
                                    <Select
                                        value={adminFormData.recipientType || RecipientType.ALL}
                                        onChange={(e) => setAdminFormData({ ...adminFormData, recipientType: e.target.value as RecipientType })}
                                        label="Alıcı Türü"
                                    >
                                        <MenuItem value={RecipientType.ALL}>Tüm Kullanıcılar</MenuItem>
                                        <MenuItem value={RecipientType.REGISTERED}>Kayıtlı Kullanıcılar</MenuItem>
                                        <MenuItem value={RecipientType.ANONYMOUS}>Anonim Kullanıcılar</MenuItem>
                                        <MenuItem value={RecipientType.REGISTERED_AND_ANONYMOUS}>Kayıtlı ve Anonim</MenuItem>
                                    </Select>
                                </FormControl>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Email Listesi (virgülle ayrılmış)"
                                        value={adminFormData.emailList?.join(', ') || ''}
                                        onChange={(e) => setAdminFormData({ 
                                            ...adminFormData, 
                                            emailList: e.target.value.split(',').map(email => email.trim()).filter(email => email)
                                        })}
                                        helperText="Alıcı türü kullanmak için boş bırakın"
                                    />
                                    {adminFormData.emailList && adminFormData.emailList.length > 0 && (
                                        <FormControlLabel
                                            control={<Switch checked={useUrlEndpoint} onChange={(e) => setUseUrlEndpoint(e.target.checked)} />}
                                            label="URL Endpoint Kullan"
                                            sx={{ mt: 1 }}
                                        />
                                    )}
                                </Grid>
                                <Grid item xs={12}>
                                    <Stack direction="row" flexWrap="wrap" gap={2}>
                                        <FormControlLabel control={<Switch checked={adminFormData.sendPush ?? true} onChange={(e) => setAdminFormData({ ...adminFormData, sendPush: e.target.checked })} />} label="Push" />
                                        <FormControlLabel control={<Switch checked={adminFormData.sendEmail ?? false} onChange={(e) => setAdminFormData({ ...adminFormData, sendEmail: e.target.checked })} />} label="E-posta" />
                                        <FormControlLabel control={<Switch checked={adminFormData.sendTelegram ?? false} onChange={(e) => setAdminFormData({ ...adminFormData, sendTelegram: e.target.checked })} />} label="Telegram" />
                                        <FormControlLabel control={<Switch checked={adminFormData.sendWebSocket ?? true} onChange={(e) => setAdminFormData({ ...adminFormData, sendWebSocket: e.target.checked })} />} label="WebSocket" />
                                    </Stack>
                                </Grid>
                            </FormGrid>
                        </FormSection>

                        {selectedTemplate && (
                            <FormSection title="Şablona Özel Parametreler">
                                <FormGrid>
                                    {renderTemplateFields()}
                                </FormGrid>
                            </FormSection>
                        )}

                        <FormSection title="Teknik Detaylar (Opsiyonel)">
                            <FormGrid>
                                <TextField
                                    fullWidth
                                    label="Template Code"
                                    value={adminFormData.templateCode || ''}
                                    onChange={(e) => setAdminFormData({ ...adminFormData, templateCode: e.target.value })}
                                />
                                <TextField
                                    fullWidth
                                    label="Sender ID"
                                    value={adminFormData.senderId || ''}
                                    onChange={(e) => setAdminFormData({ ...adminFormData, senderId: e.target.value })}
                                />
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Template Parameters (JSON)"
                                        value={JSON.stringify(adminFormData.templateParameters || {}, null, 2)}
                                        onChange={(e) => {
                                            try {
                                                setAdminFormData({
                                                    ...adminFormData,
                                                    templateParameters: JSON.parse(e.target.value)
                                                });
                                            } catch (error) {
                                                console.error('Invalid JSON:', error);
                                            }
                                        }}
                                        multiline
                                        rows={3}
                                    />
                                </Grid>
                            </FormGrid>
                        </FormSection>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 3, px: 4 }}>
                    <Button onClick={handleCloseAdminDialog}>İptal</Button>
                    <Button 
                        onClick={() => handleAdminSubmit('sendBulkNotificationCustom')} 
                        variant="contained"
                        disabled={!adminFormData.title || !adminFormData.content || !adminFormData.type}
                        sx={{ minWidth: 150 }}
                    >
                        Bildirim Gönder
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
