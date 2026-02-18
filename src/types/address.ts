export interface Address {
    id?: string;
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
    isDefault?: boolean;
} 