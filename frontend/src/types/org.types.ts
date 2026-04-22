export type UserRole = 'platform_admin' | 'org_owner' | 'org_admin' | 'moderator' | 'user' | 'api_key';
export type OrgStatus = 'active' | 'suspended' | 'trial';
export type PlanTier = 'free' | 'starter' | 'pro' | 'enterprise';

export interface Organization {
  orgId: string;
  name: string;
  slug: string;
  ownerId: string;
  plan: PlanTier;
  status: OrgStatus;
  webhookUrl?: string;
  webhookSecret?: string;
  settings: { autoRejectAbove: number; humanReviewThreshold: number; defaultPolicyId?: string };
  createdAt: unknown;
  updatedAt: unknown;
}

export interface Member {
  userId: string;
  orgId: string;
  email: string;
  displayName: string;
  role: UserRole;
  joinedAt: unknown;
  lastActiveAt: unknown;
}
