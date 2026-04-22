export type ContentType = 'text' | 'image' | 'audio' | 'video' | 'batch';
export type ContentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'queued_for_review';

export interface Content {
  contentId: string;
  orgId: string;
  policyId?: string;
  submittedBy: string;
  externalId?: string;
  type: ContentType;
  text?: string;
  mediaUrl?: string;
  status: ContentStatus;
  metadata?: Record<string, unknown>;
  createdAt: unknown;
  updatedAt: unknown;
  processedAt?: unknown;
}
