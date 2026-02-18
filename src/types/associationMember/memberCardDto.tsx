import { CardStatus } from "./cardStatus";

export interface MemberCardDto {
  memberId: string;
  memberName: string;
  membershipNumber: string;
  membershipCardNumber: string;
  membershipCardIssuedDate: string;
  membershipCardExpiryDate: string;
  membershipCardStatus: CardStatus;
  membershipCardQrCode: string;
  membershipCardDesignUrl: string;
  showName: boolean;
  showMembershipNumber: boolean;
  showJoinDate: boolean;
  showExpiryDate: boolean;
  showBenefits: boolean;
  membershipCardUsageCount: number;
  membershipCardLastUsedAt: string;
  membershipCardUsageHistory: string;
  associationName: string;
  associationCode: string;
} 