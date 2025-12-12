import { Package, Award, Sparkles } from 'lucide-react';
import { ITEM_TYPES } from '../../utils/itemTypes';

/**
 * Display appropriate icon for item type
 * @param {Object} props
 * @param {string} props.type - Item type
 * @param {string} props.className - Additional CSS classes
 */
export function ItemTypeIcon({ type, className = 'h-5 w-5' }) {
  switch (type) {
    case ITEM_TYPES.AVATAR_FRAME:
      return <Package className={className} />;
    case ITEM_TYPES.BADGE:
      return <Award className={className} />;
    default:
      return <Sparkles className={className} />;
  }
}
