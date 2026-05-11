import { api } from '../api';
import { ApiResponse } from '../../types/api';
import { PageResponseDto, UserCardDto } from '../../types/userCard/userCardModel';

/// Admin-only client for the personal user card endpoints exposed by
/// business-service. The backend wraps lists in PageResponseDto and singles
/// in ApiResponse — we mirror both here.
export class UserCardService {
  private static instance: UserCardService;
  private readonly baseUrl = '/businesses/admin/user-cards';

  private constructor() {}

  public static getInstance(): UserCardService {
    if (!UserCardService.instance) {
      UserCardService.instance = new UserCardService();
    }
    return UserCardService.instance;
  }

  async list(search: string | undefined, page = 0, size = 20): Promise<PageResponseDto<UserCardDto>> {
    const params: Record<string, string | number> = { page, size };
    if (search && search.trim()) params.search = search.trim();
    const response = await api.get<ApiResponse<PageResponseDto<UserCardDto>>>(this.baseUrl, { params });
    return response.data.data;
  }

  async setVisibility(userEmail: string, mobileVisible: boolean): Promise<UserCardDto> {
    const response = await api.patch<ApiResponse<UserCardDto>>(
      `${this.baseUrl}/${encodeURIComponent(userEmail)}/visibility`,
      { mobileVisible },
    );
    return response.data.data;
  }
}
