export interface AddressDTO {
    id: string;
    city: string;
    district: string;
    country: string;
    village?: string;
    street?: string;
    postalCode?: string;
    description?: string;
    latitude?: number;
    longitude?: number;
    isDefault: boolean;
    
    // Additional fields for event service
    buildingNo?: string;
    floorNo?: string;
    apartmentNo?: string;
    addressDirections?: string;
} 