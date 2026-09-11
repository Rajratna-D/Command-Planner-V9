import {
  LayoutDashboard, CheckSquare, GraduationCap, ListTodo,
  FileText, Beaker, BookOpen, Timer, StickyNote, BarChart3, Settings
} from 'lucide-react';
import type { TabKey } from '../../types';

export interface NavItem {
  key: TabKey;
  label: string;
  icon: React.ReactNode;
}

export const navItems: NavItem[] = [
  { key: 'overview',      label: 'Overview',      icon: <LayoutDashboard size={20} /> },
  { key: 'tasks',         label: 'Tasks',         icon: <CheckSquare size={20} /> },
  { key: 'tests',         label: 'Tests',         icon: <GraduationCap size={20} /> },
  { key: 'lists',         label: 'Lists',         icon: <ListTodo size={20} /> },
  { key: 'assignments',   label: 'Assignments',   icon: <FileText size={20} /> },
  { key: 'practicals',    label: 'Practicals',    icon: <Beaker size={20} /> },
  { key: 'syllabus',      label: 'Syllabus',      icon: <BookOpen size={20} /> },
  { key: 'pomodoro',      label: 'Pomodoro',      icon: <Timer size={20} /> },
  { key: 'notes',         label: 'Notes',         icon: <StickyNote size={20} /> },
  { key: 'productivity',  label: 'Productivity',  icon: <BarChart3 size={20} /> },
  { key: 'settings',      label: 'Settings',      icon: <Settings size={20} /> },
];
