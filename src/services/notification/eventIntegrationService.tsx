import { api } from '../api';
import { EventResponseDTO } from '../../types/events/eventModel';
import { TemplateType } from '../../types/notifications/notificationTemplate';

interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
    timestamp: string;
    statusCode: number;
    statusMessage: string;
}

interface EventSelectionOption {
    value: string;
    label: string;
    event: EventResponseDTO;
    category: string;
    date: string;
    location: string;
}

interface EventNotificationData {
    eventId: string;
    eventName: string;
    eventDescription: string;
    eventTime: string;
    eventEndTime: string;
    organizerName: string;
    location: string;
    category: string;
    customMessage?: string;
    reminderTime?: string;
}

export const eventIntegrationService = {
    /**
     * Get popular events for notification templates
     */
    getPopularEvents: async (): Promise<EventSelectionOption[]> => {
        try {
            const response = await api.get<ApiResponse<{ content: EventResponseDTO[] }>>('/events/popular/all', {
                params: {
                    page: 0,
                    size: 20,
                    sort: 'popularityScore,desc'
                }
            });
            
            if (!response.data.success) {
                throw new Error(response.data.message);
            }

            return response.data.data.content.map(event => ({
                value: event.id,
                label: `${event.name} - ${new Date(event.eventTime).toLocaleDateString('tr-TR')}`,
                event,
                category: event.category?.name || 'Kategori Yok',
                date: new Date(event.eventTime).toLocaleDateString('tr-TR'),
                location: `${event.address?.city}, ${event.address?.district}`
            }));
        } catch (error) {
            console.error('Error fetching popular events:', error);
            throw new Error('Popüler etkinlikler yüklenirken hata oluştu');
        }
    },

    /**
     * Get events by organizer (for future use)
     */
    getEventsByOrganizer: async (organizerId: string): Promise<EventSelectionOption[]> => {
        try {
            const response = await api.get<ApiResponse<EventResponseDTO[]>>(`/events/organizer/${organizerId}`);
            
            if (!response.data.success) {
                throw new Error(response.data.message);
            }

            return response.data.data.map(event => ({
                value: event.id,
                label: `${event.name} - ${new Date(event.eventTime).toLocaleDateString('tr-TR')}`,
                event,
                category: event.category?.name || 'Kategori Yok',
                date: new Date(event.eventTime).toLocaleDateString('tr-TR'),
                location: `${event.address?.city}, ${event.address?.district}`
            }));
        } catch (error) {
            console.error('Error fetching organizer events:', error);
            throw new Error('Organizatör etkinlikleri yüklenirken hata oluştu');
        }
    },

    /**
     * Get event details for notification
     */
    getEventDetails: async (eventId: string): Promise<EventResponseDTO> => {
        try {
            const response = await api.get<ApiResponse<EventResponseDTO>>(`/events/${eventId}`);
            
            if (!response.data.success) {
                throw new Error(response.data.message);
            }

            return response.data.data;
        } catch (error) {
            console.error('Error fetching event details:', error);
            throw new Error('Etkinlik detayları yüklenirken hata oluştu');
        }
    },

    /**
     * Generate notification data from event
     */
    generateEventNotificationData: async (
        eventId: string, 
        templateType: TemplateType,
        customData?: any
    ): Promise<EventNotificationData> => {
        const event = await eventIntegrationService.getEventDetails(eventId);
        
        const baseData: EventNotificationData = {
            eventId: event.id,
            eventName: event.name,
            eventDescription: event.description,
            eventTime: event.eventTime,
            eventEndTime: event.endTime,
            organizerName: event.organizerId, // Bu alan organizer name olarak güncellenebilir
            location: `${event.address?.city}, ${event.address?.district}`,
            category: event.category?.name || 'Kategori Yok',
            ...customData
        };

        // Template-specific data processing
        switch (templateType) {
            case TemplateType.EVENT_REMINDER:
                return {
                    ...baseData,
                    reminderTime: customData?.reminderTime || event.eventTime,
                    customMessage: customData?.customMessage || ''
                };
            
            default:
                return baseData;
        }
    },

    /**
     * Generate automatic content for event reminder
     */
    generateEventReminderContent: (eventData: EventNotificationData, customMessage?: string, notificationStyle: string = 'friendly'): {
        title: string;
        content: string;
        templateParameters: any;
    } => {
        const eventDate = new Date(eventData.eventTime);
        const formattedDate = eventDate.toLocaleDateString('tr-TR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const shortDate = eventDate.toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit'
        });

        let title = '';
        let content = '';

        // Generate content based on notification style
        switch (notificationStyle) {
            case 'friendly':
                title = `🔔 Unutma!`;
                content = `📅 ${eventData.eventName} yarın ${shortDate}'de başlıyor.\n`;
                content += `📍 Yer: ${eventData.location}\n`;
                content += `🤝 Seni aramızda görmek için sabırsızlanıyoruz!`;
                break;

            case 'energetic':
                title = `🚀 Hazır mısın?`;
                content = `${eventData.eventName} yarın ${shortDate}'de ${eventData.location}'da!\n`;
                content += `🎟 Hemen takvimine ekle ve yerini ayır.`;
                break;

            case 'short':
                title = `⏰ Yarın görüşüyoruz!`;
                content = `${eventData.eventName} – ${shortDate}, ${eventData.location}.`;
                break;

            case 'cultural':
                title = `💙 Buluşma zamanı yaklaştı!`;
                content = `${eventData.eventName} yarın ${shortDate}'de ${eventData.location}'da.\n`;
                content += `Kültürümüzü birlikte yaşatıyoruz.`;
                break;

            case 'wedding':
                title = `💒 Yaklaşan bir düğün var!`;
                content = `${eventData.eventName} ${shortDate}'de ${eventData.location}'da başlıyor.\n`;
                content += `Bu mutlu ana sen de tanık ol!`;
                break;

            default:
                title = `📅 ${eventData.eventName} - Etkinlik Hatırlatması`;
                content = `Merhaba! ${eventData.eventName} etkinliği ${formattedDate} tarihinde başlayacak.\n\n`;
                content += `📍 Konum: ${eventData.location}\n`;
                content += `🏷️ Kategori: ${eventData.category}\n`;
                
                if (eventData.eventDescription) {
                    content += `📝 Açıklama: ${eventData.eventDescription}\n\n`;
                }
                
                if (customMessage) {
                    content += `💬 ${customMessage}\n\n`;
                }
                
                content += `Etkinliğe katılmak için uygulamayı açın ve detayları kontrol edin.`;
        }

        // Add custom message if provided
        if (customMessage && customMessage.trim()) {
            content += `\n\n💬 ${customMessage}`;
        }

        const templateParameters = {
            eventId: eventData.eventId,
            eventName: eventData.eventName,
            eventTime: formattedDate,
            shortTime: shortDate,
            eventLocation: eventData.location,
            eventCategory: eventData.category,
            eventDescription: eventData.eventDescription,
            customMessage: customMessage || '',
            reminderTime: eventData.reminderTime,
            notificationStyle
        };

        return { title, content, templateParameters };
    },

    /**
     * Generate automatic content for system maintenance
     */
    generateSystemMaintenanceContent: (maintenanceData: any, customMessage?: string, notificationStyle: string = 'pre_notice_short'): {
        title: string;
        content: string;
        templateParameters: any;
    } => {
        const startDate = new Date(maintenanceData.startTime);
        const endDate = new Date(maintenanceData.endTime);
        
        const maintenanceDate = startDate.toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        
        const maintenanceTime = `${startDate.toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit'
        })} - ${endDate.toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit'
        })}`;

        const duration = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)); // hours

        let title = '';
        let content = '';

        // Generate content based on notification style
        switch (notificationStyle) {
            case 'pre_notice_short':
                title = `Sistem Bakımı Duyurusu ⚙️`;
                content = `${maintenanceDate} tarihinde ${maintenanceTime} saatleri arasında sistemimiz bakımda olacak.\n\n`;
                content += `Bu süre zarfında bazı hizmetler kullanılamayabilir.`;
                break;

            case 'pre_notice_friendly':
                title = `Bakım zamanı geldi! 🔧`;
                content = `Sevgili kullanıcılarımız, ${maintenanceDate} ${maintenanceTime} arasında sistemimiz kısa süreliğine bakıma alınacaktır.\n\n`;
                content += `Hizmetlerimize ara vereceğiz, anlayışınız için teşekkürler!`;
                break;

            case 'reminder':
                title = `Yaklaşan Bakım ⏰`;
                content = `Dikkat! ${maintenanceDate} ${maintenanceTime}'de planlı bakım yapılacak.\n\n`;
                content += `Lütfen bu süreyi göz önünde bulundurun.`;
                break;

            case 'completed':
                title = `Bakım Tamamlandı ✅`;
                content = `Sistemimizdeki bakım başarıyla tamamlandı.\n\n`;
                content += `Artık tüm hizmetlerimizi sorunsuz şekilde kullanabilirsiniz!`;
                break;

            default:
                title = `Sistem Bakımı Duyurusu ⚙️`;
                content = `${maintenanceDate} tarihinde ${maintenanceTime} saatleri arasında sistemimiz bakımda olacak.\n\n`;
                content += `Bu süre zarfında bazı hizmetler kullanılamayabilir.`;
        }

        // Add custom message if provided
        if (customMessage && customMessage.trim()) {
            content += `\n\n💬 ${customMessage}`;
        }

        // Add affected services if specified
        if (maintenanceData.affectedServices && maintenanceData.affectedServices.length > 0) {
            const services = maintenanceData.affectedServices.join(', ');
            content += `\n\n🔧 Etkilenen Hizmetler: ${services}`;
        }

        // Add status page URL if provided
        if (maintenanceData.statusPageUrl) {
            content += `\n\n📊 Durum sayfası: ${maintenanceData.statusPageUrl}`;
        }

        const templateParameters = {
            maintenanceType: maintenanceData.maintenanceType,
            startTime: maintenanceData.startTime,
            endTime: maintenanceData.endTime,
            maintenanceDate,
            maintenanceTime,
            duration,
            affectedServices: maintenanceData.affectedServices || [],
            statusPageUrl: maintenanceData.statusPageUrl || '',
            customMessage: customMessage || '',
            notificationStyle
        };

        return { title, content, templateParameters };
    },

    /**
     * Calculate optimal reminder time
     */
    calculateReminderTime: (eventTime: string, reminderType: '1hour' | '1day' | '1week' | 'custom'): string => {
        const eventDate = new Date(eventTime);
        let reminderDate: Date;

        switch (reminderType) {
            case '1hour':
                reminderDate = new Date(eventDate.getTime() - 60 * 60 * 1000);
                break;
            case '1day':
                reminderDate = new Date(eventDate.getTime() - 24 * 60 * 60 * 1000);
                break;
            case '1week':
                reminderDate = new Date(eventDate.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            default:
                reminderDate = eventDate;
        }

        return reminderDate.toISOString();
    },

    /**
     * Validate event for notification
     */
    validateEventForNotification: (event: EventResponseDTO): { isValid: boolean; errors: string[] } => {
        const errors: string[] = [];
        const now = new Date();
        const eventDate = new Date(event.eventTime);

        // Check if event is in the future
        if (eventDate <= now) {
            errors.push('Etkinlik tarihi geçmiş bir tarih olamaz');
        }

        // Check if event has required fields
        if (!event.name) {
            errors.push('Etkinlik adı gereklidir');
        }

        if (!event.eventTime) {
            errors.push('Etkinlik tarihi gereklidir');
        }

        if (!event.address) {
            errors.push('Etkinlik adresi gereklidir');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    },

    /**
     * Get event participants for targeted notifications
     */
    getEventParticipants: async (eventId: string): Promise<string[]> => {
        try {
            const response = await api.get<ApiResponse<{ participants: Array<{ userId: string }> }>>(
                `/events/${eventId}/participants`
            );
            
            if (!response.data.success) {
                throw new Error(response.data.message);
            }

            return response.data.data.participants.map(p => p.userId);
        } catch (error) {
            console.error('Error fetching event participants:', error);
            throw new Error('Etkinlik katılımcıları yüklenirken hata oluştu');
        }
    },

    /**
     * Search events for notification
     */
    searchEvents: async (searchTerm: string): Promise<EventSelectionOption[]> => {
        try {
            const response = await api.get<ApiResponse<EventResponseDTO[]>>('/events/search', {
                params: { keyword: searchTerm, isUpcoming: true }
            });
            
            if (!response.data.success) {
                throw new Error(response.data.message);
            }

            return response.data.data.map(event => ({
                value: event.id,
                label: `${event.name} - ${new Date(event.eventTime).toLocaleDateString('tr-TR')}`,
                event,
                category: event.category?.name || 'Kategori Yok',
                date: new Date(event.eventTime).toLocaleDateString('tr-TR'),
                location: `${event.address?.city}, ${event.address?.district}`
            }));
        } catch (error) {
            console.error('Error searching events:', error);
            throw new Error('Etkinlik arama sırasında hata oluştu');
        }
    }
};
