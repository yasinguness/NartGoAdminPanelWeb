export interface AdminNotificationStats {
    generatedAt: string; // ISO string format
    
    // Device statistics
    totalDevices: number;
    activeDevices: number;
    registeredDevices: number;
    anonymousDevices: number;
    
    // User statistics
    totalUsers: number;
    registeredUsers: number;
    anonymousUsers: number;
    
    // Notification statistics
    totalNotifications: number;
    unreadNotifications: number;
    readNotifications: number;
    
    // Channel statistics
    notificationsByType: { [key: string]: number };
    notificationsByPriority: { [key: string]: number };
    
    // Recent activity
    notificationsLast24Hours: number;
    notificationsLast7Days: number;
    notificationsLast30Days: number;
    
    // Device breakdown
    devicesByType: { [key: string]: number }; // android, ios, web
    devicesByStatus: { [key: string]: number }; // active, inactive
    
    // Geographic statistics (if available)
    usersByCountry: { [key: string]: number };
    usersByCity: { [key: string]: number };
}

// Helper function to create AdminNotificationStats
export const createAdminNotificationStats = (data: Partial<AdminNotificationStats>): AdminNotificationStats => {
    return {
        generatedAt: new Date().toISOString(),
        totalDevices: 0,
        activeDevices: 0,
        registeredDevices: 0,
        anonymousDevices: 0,
        totalUsers: 0,
        registeredUsers: 0,
        anonymousUsers: 0,
        totalNotifications: 0,
        unreadNotifications: 0,
        readNotifications: 0,
        notificationsByType: {},
        notificationsByPriority: {},
        notificationsLast24Hours: 0,
        notificationsLast7Days: 0,
        notificationsLast30Days: 0,
        devicesByType: {},
        devicesByStatus: {},
        usersByCountry: {},
        usersByCity: {},
        ...data
    };
};
