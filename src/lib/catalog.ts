import type { Category, Condition } from './types';

export const CATEGORIES: { id: Category; label: string; icon: string; tint: [string, string] }[] = [
  { id: 'mobiles', label: 'Mobiles', icon: 'phone-portrait', tint: ['#2F6FED', '#5B8DF5'] },
  { id: 'vehicles', label: 'Cars', icon: 'car-sport', tint: ['#D9443B', '#F07A5E'] },
  { id: 'bikes', label: 'Bikes', icon: 'bicycle', tint: ['#F08A24', '#FFB547'] },
  { id: 'property', label: 'Property', icon: 'home', tint: ['#0E7C66', '#2BB596'] },
  { id: 'electronics', label: 'Electronics', icon: 'tv', tint: ['#7C4DDB', '#A37BF0'] },
  { id: 'home', label: 'Furniture', icon: 'bed', tint: ['#A4683A', '#CE9461'] },
  { id: 'fashion', label: 'Fashion', icon: 'shirt', tint: ['#D63C8B', '#F06DAE'] },
  { id: 'jobs', label: 'Jobs', icon: 'briefcase', tint: ['#334155', '#64748B'] },
  { id: 'animals', label: 'Animals', icon: 'paw', tint: ['#4B8B2B', '#7DB955'] },
  { id: 'other', label: 'Other', icon: 'grid', tint: ['#0F766E', '#14B8A6'] },
];
export const catOf = (id: Category) => CATEGORIES.find(c => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];

export const CONDITIONS: { id: Condition; label: string }[] = [
  { id: 'new', label: 'New' },
  { id: 'like_new', label: 'Like new' },
  { id: 'used', label: 'Used' },
  { id: 'for_parts', label: 'For parts' },
];
export const conditionLabel = (c: Condition) => CONDITIONS.find(x => x.id === c)?.label ?? c;

export const CITIES = [
  'Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar',
  'Quetta', 'Sialkot', 'Gujranwala', 'Hyderabad', 'Bahawalpur', 'Sargodha', 'Abbottabad',
];
