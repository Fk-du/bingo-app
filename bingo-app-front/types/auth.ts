import { Role } from './enums';

export interface LoginRequest {
  initData: string;
  startParam?: string;
}

export interface UserProfileResponse {
  id: number;
  telegramId: number;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  role: Role;
  adminUserId: number | null;
  businessName: string | null;
  depositAccountInfo: string | null;
  adminApproved: boolean;
  parentId: number | null;
  balance: number;
  frozenBalance: number;
  active: boolean;
}
