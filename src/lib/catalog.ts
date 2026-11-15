import type { Category, Condition } from './types';

export const CATEGORIES: { id: Category; label: string; icon: string; tint: [string, string] }[] = [
  { id: 'mobiles', label: 'Mobiles', icon: 'phone-portrait', tint: ['#4F2FE0', '#7B61FF'] },
  { id: 'vehicles', label: 'Cars', icon: 'car-sport', tint: ['#16131D', '#3B3550'] },
  { id: 'bikes', label: 'Bikes', icon: 'bicycle', tint: ['#FF5A36', '#FF8A5C'] },
  { id: 'property', label: 'Property', icon: 'home', tint: ['#0F8A6A', '#2BC48F'] },
  { id: 'electronics', label: 'Electronics', icon: 'tv', tint: ['#2F6FED', '#6C9BFF'] },
  { id: 'home', label: 'Furniture', icon: 'bed', tint: ['#B0703C', '#D99A63'] },
  { id: 'fashion', label: 'Fashion', icon: 'shirt', tint: ['#D9367C', '#F26BA6'] },
  { id: 'jobs', label: 'Jobs', icon: 'briefcase', tint: ['#5B5470', '#8A83A0'] },
  { id: 'animals', label: 'Animals', icon: 'paw', tint: ['#6E9E1F', '#A3CC3A'] },
  { id: 'other', label: 'Other', icon: 'grid', tint: ['#7B61FF', '#B39DFF'] },
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
