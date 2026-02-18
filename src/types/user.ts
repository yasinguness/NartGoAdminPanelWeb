import { Address } from './address';
import { UserRole, UserStatus, AccountType } from './enums';

export interface User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    password?: string;
    address: Address[];
    gsmNo: string;
    phoneCode: string;
    birthDate: string; // ISO string format
    imageUrl?: string;
    race: string;
    family: string;
    job?: string;
    role?: Set<UserRole>;
    userStatus: UserStatus;
    accountType?: AccountType;
}

export class UserModel implements User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    password?: string;
    address: Address[];
    gsmNo: string;
    phoneCode: string;
    birthDate: string;
    imageUrl?: string;
    race: string;
    family: string;
    job?: string;
    role?: Set<UserRole>;
    userStatus: UserStatus;
    accountType?: AccountType;

    constructor(data: User) {
        this.id = data.id;
        this.firstName = data.firstName;
        this.lastName = data.lastName;
        this.email = data.email;
        this.password = data.password;
        this.address = data.address;
        this.gsmNo = data.gsmNo;
        this.phoneCode = data.phoneCode;
        this.birthDate = data.birthDate;
        this.imageUrl = data.imageUrl;
        this.race = data.race;
        this.family = data.family;
        this.job = data.job;
        this.role = data.role;
        this.userStatus = data.userStatus;
        this.accountType = data.accountType;
    }

    static fromJson(json: any): UserModel {
        return new UserModel({
            id: json.id,
            firstName: json.firstName,
            lastName: json.lastName,
            email: json.email,
            password: json.password,
            imageUrl: json.imageUrl,
            address: (json.address || []).map((addr: any) => ({
                id: addr.id,
                street: addr.street,
                city: addr.city,
                state: addr.state,
                country: addr.country,
                zipCode: addr.zipCode,
                isDefault: addr.isDefault
            })),
            gsmNo: json.gsmNo,
            phoneCode: json.phoneCode,
            birthDate: json.birthDate,
            race: json.race,
            family: json.family,
            role: new Set(json.role || []),
            userStatus: json.userStatus,
            job: json.job || '',
            accountType: json.accountType
        });
    }

    toJson(): Record<string, any> {
        return {
            id: this.id,
            firstName: this.firstName,
            lastName: this.lastName,
            email: this.email,
            gsmNo: this.gsmNo,
            imageUrl: this.imageUrl,
            phoneCode: this.phoneCode,
            birthDate: this.birthDate,
            race: this.race,
            family: this.family,
            job: this.job || '',
            role: Array.from(this.role || []),
            userStatus: this.userStatus,
            accountType: this.accountType,
            address: this.address
        };
    }

    hasRole(role: UserRole): boolean {
        return this.role?.has(role) ?? false;
    }

    get fullName(): string {
        return `${this.firstName} ${this.lastName}`;
    }
} 