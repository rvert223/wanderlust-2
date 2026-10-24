// A sighting category's line icon (replaces the old category emoji in the UI).
import { CATEGORIES } from '../config/categories';
import Icon from './Icon';

export default function CategoryIcon({ category }) {
  return <Icon name={CATEGORIES[category]?.icon ?? 'leaf'} />;
}
