import { type ModerationDecision } from '../types/moderation.types';

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatTimeAgo(date: unknown): string {
  if (!date) return '';
  const d = date instanceof Date ? date : typeof date === 'object' && date !== null && 'toDate' in date
    ? (date as { toDate: () => Date }).toDate() : new Date(date as string);
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function getDecisionColor(decision?: ModerationDecision | string): string {
  switch (decision) {
    case 'approved': return 'text-emerald-400';
    case 'rejected': return 'text-red-400';
    case 'flagged': return 'text-amber-400';
    case 'needs_human_review': return 'text-purple-400';
    default: return 'text-aegis-text3';
  }
}

export function getDecisionBadgeClass(decision?: ModerationDecision | string): string {
  switch (decision) {
    case 'approved': return 'badge-approved';
    case 'rejected': return 'badge-rejected';
    case 'flagged': return 'badge-flagged';
    case 'needs_human_review': return 'badge-review';
    default: return 'badge-pending';
  }
}

export function getSeverityColor(severity: number): string {
  if (severity > 70) return '#ef4444';
  if (severity > 40) return '#f59e0b';
  return '#10b981';
}

export function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}
