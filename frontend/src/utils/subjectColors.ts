/* ═══════════════════════════════════════════════════════════════════════════
   Subject Color System — auto-assigns persistent colors to subjects
   ═══════════════════════════════════════════════════════════════════════════ */

const SUBJECT_COLORS = [
  { bg: 'bg-brand-50 [html[data-theme=dark]_&]:bg-brand-600/10', text: 'text-brand-600 [html[data-theme=dark]_&]:text-brand-400', hex: '#3b82f6' },
  { bg: 'bg-accent-50 [html[data-theme=dark]_&]:bg-accent-600/10', text: 'text-accent-600 [html[data-theme=dark]_&]:text-accent-400', hex: '#8b5cf6' },
  { bg: 'bg-success-50 [html[data-theme=dark]_&]:bg-success-600/10', text: 'text-success-600 [html[data-theme=dark]_&]:text-success-400', hex: '#10b981' },
  { bg: 'bg-warning-50 [html[data-theme=dark]_&]:bg-warning-600/10', text: 'text-warning-600 [html[data-theme=dark]_&]:text-warning-400', hex: '#f59e0b' },
  { bg: 'bg-danger-50 [html[data-theme=dark]_&]:bg-danger-600/10', text: 'text-danger-600 [html[data-theme=dark]_&]:text-danger-400', hex: '#ef4444' },
  { bg: 'bg-pink-50 [html[data-theme=dark]_&]:bg-pink-600/10', text: 'text-pink-600 [html[data-theme=dark]_&]:text-pink-400', hex: '#ec4899' },
  { bg: 'bg-cyan-50 [html[data-theme=dark]_&]:bg-cyan-600/10', text: 'text-cyan-600 [html[data-theme=dark]_&]:text-cyan-400', hex: '#06b6d4' },
  { bg: 'bg-orange-50 [html[data-theme=dark]_&]:bg-orange-600/10', text: 'text-orange-600 [html[data-theme=dark]_&]:text-orange-400', hex: '#f97316' },
  { bg: 'bg-teal-50 [html[data-theme=dark]_&]:bg-teal-600/10', text: 'text-teal-600 [html[data-theme=dark]_&]:text-teal-400', hex: '#14b8a6' },
  { bg: 'bg-indigo-50 [html[data-theme=dark]_&]:bg-indigo-600/10', text: 'text-indigo-600 [html[data-theme=dark]_&]:text-indigo-400', hex: '#6366f1' },
];

import { useAppStore } from '../store/appStore';

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export function getSubjectColor(subject: string) {
  const normSubject = (subject || '').toLowerCase().trim();
  const custom = useAppStore.getState().subjectConfigs?.[normSubject];
  if (custom && custom.color) {
    return {
      bg: '',
      text: '',
      hex: custom.color,
      isCustom: true
    };
  }
  const index = hashCode(normSubject) % SUBJECT_COLORS.length;
  return SUBJECT_COLORS[index];
}

export function getSubjectHex(subject: string): string {
  return getSubjectColor(subject).hex;
}

export function getSubjectConfig(subject: string) {
  const normSubject = (subject || '').toLowerCase().trim();
  const custom = useAppStore.getState().subjectConfigs?.[normSubject];
  const hex = custom?.color || getSubjectColor(subject).hex;
  const icon = custom?.icon || '📚';
  
  return {
    color: hex,
    icon,
    hex,
    badgeStyle: {
      backgroundColor: `${hex}18`,
      borderColor: `${hex}40`,
      color: hex,
    },
    borderStyle: {
      borderLeftColor: hex,
      borderLeftWidth: '4px',
    },
    progressStyle: {
      backgroundColor: hex,
    },
  };
}

export { SUBJECT_COLORS };
