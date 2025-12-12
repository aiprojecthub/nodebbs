import { Coins } from 'lucide-react';
import { formatCredits } from '../../utils/formatters';

/**
 * Display credits amount with icon
 * @param {Object} props
 * @param {number} props.amount - Credits amount
 * @param {'default'|'large'} props.variant - Display variant
 * @param {string} props.className - Additional CSS classes
 */
export function CreditsBadge({ amount, variant = 'default', className = '' }) {
  const isLarge = variant === 'large';
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Coins className={`${isLarge ? 'h-5 w-5' : 'h-4 w-4'} text-yellow-500`} />
      <span className={`${isLarge ? 'text-xl' : 'text-base'} font-bold text-yellow-600`}>
        {formatCredits(amount)}
      </span>
    </div>
  );
}
