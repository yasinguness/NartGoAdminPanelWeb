export interface RoleCount {
  roleName: string;
  userCount: number;
  percentOfTotal?: number;
}

export interface RecentRoleChange {
  actorEmail?: string;
  targetEmail?: string;
  action?: string;
  details?: string;
  createdAt?: string;
}

export interface RbacOverviewResponse {
  generatedAt: string;
  totalUsers: number;
  rolesBreakdown: RoleCount[];
  roleChangeCountLast30d: number;
  recentRoleChanges: RecentRoleChange[];
}
