export interface DeviceRegistrationRequest {
    email?: string;
    deviceId: string;
    fcmToken: string;
    deviceType: string;
    deviceModel?: string;
    previousDeviceId?: string;
}

// Helper function to create a new DeviceRegistrationRequest
export const createDeviceRegistrationRequest = (data: Partial<DeviceRegistrationRequest>): DeviceRegistrationRequest => {
    return {
        deviceId: '',
        fcmToken: '',
        deviceType: '',
        ...data
    };
};

// Device type enum for better type safety
export enum DeviceType {
    ANDROID = 'ANDROID',
    IOS = 'IOS',
    WEB = 'WEB',
    DESKTOP = 'DESKTOP'
}

// Extended interface with device type enum
export interface DeviceRegistrationRequestWithEnum extends Omit<DeviceRegistrationRequest, 'deviceType'> {
    deviceType: DeviceType;
}

// Helper function to create a new DeviceRegistrationRequestWithEnum
export const createDeviceRegistrationRequestWithEnum = (data: Partial<DeviceRegistrationRequestWithEnum>): DeviceRegistrationRequestWithEnum => {
    return {
        deviceId: '',
        fcmToken: '',
        deviceType: DeviceType.WEB,
        ...data
    };
}; 