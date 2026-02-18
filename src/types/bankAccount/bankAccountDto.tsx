export interface BankAccountDto {
  id: string;
  
  // Required fields (marked with @NotBlank in Java)
  bankName: string;
  branchName: string;
  accountHolderName: string;
  iban: string;
  accountType: string;
  
  // Optional fields
  branchCode?: string;
  accountNumber?: string;
  swiftCode?: string;
  isActive?: boolean;
  isDefault?: boolean;
  openingDate?: Date;
  closingDate?: Date;
  balance?: number;
  accountLimit?: number;
  description?: string;
  
  // Audit information
  createdAt?: Date;
  updatedAt?: Date;
}
