export interface AdminSubscriptionPaymentDto {

        // Transaction Info
        id: string;
        paymentDate: Date;
        amount: number;
        currency: string;
        status: string;
        eventType: string;
        revenuecatTransactionId: string;
        
        // Member Info
        memberName: string;
        memberEmail: string;
        membershipNumber: string;
        packageType: string;
        membershipDuration: string;
        
        // Subscription Info
        productId: string;
        subscriptionStatus: string;
        expirationDate: Date;
        platform: string;
        
        // Business Info (if applicable)
        businessName: string;
        businessId: string;
        
        // Additional useful info
        environment: string; // SANDBOX, PRODUCTION
        createdAt: Date;
        subscriptionType: SubscriptionType;

    }

    export enum SubscriptionType {
        BUSINESS_SUBSCRIPTION = 'BUSINESS_SUBSCRIPTION',
        MEMBER_SUBSCRIPTION = 'MEMBER_SUBSCRIPTION',
    }