export type AppView = 
  | 'home' 
  | 'announcements' 
  | 'issues' 
  | 'map' 
  | 'surveys' 
  | 'directory' 
  | 'admin';

export interface NavItem {
  id: AppView;
  label: string;
  shortLabel: string;
  icon: string;
  badge?: string;
  description: string;
}
