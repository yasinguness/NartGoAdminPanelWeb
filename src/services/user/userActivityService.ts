import { api } from '../api';
import { ApiResponse } from '../../types/api';

/** App-bazlı son-aktiflik satırı (auth-service UserActivityRowDto). */
export interface UserActivityRow {
  id: string;
  email: string;
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  accountType?: string | null;
  nartgoLastActiveAt?: string | null;
  nbLastActiveAt?: string | null;
}

/** Spring Page yanıtının kullandığımız alt kümesi. */
export interface SpringPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface UserActivityQuery {
  app: 'NARTGO' | 'NARTBUSINESS';
  q?: string;
  mode?: 'all' | 'active' | 'inactive';
  days?: number;
  page?: number;
  size?: number;
}

export const userActivityService = {
  async list(params: UserActivityQuery): Promise<SpringPage<UserActivityRow>> {
    const res = await api.get<ApiResponse<SpringPage<UserActivityRow>>>(
      '/auth/admin/users/activity',
      { params },
    );
    return res.data.data;
  },
};

export default userActivityService;
