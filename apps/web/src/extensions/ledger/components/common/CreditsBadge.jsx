import { Coins } from 'lucide-react';
import { formatCredits } from '../../utils/formatters';
import { DEFAULT_CURRENCY_CODE } from '../../constants';

/**
 * 显示带图标的积分金额
 * @param {Object} props
 * @param {number} props.amount - 积分数量
 * @param {'default'|'large'} props.variant - 显示变体
 * @param {string} props.className - 额外的 CSS 类
 */
export function CreditsBadge({ amount, currencyCode = DEFAULT_CURRENCY_CODE, variant = 'default', className = '' }) {
  const isLarge = variant === 'large';

  const getSymbol = (code) => {
    switch (code) {
      case DEFAULT_CURRENCY_CODE: return <Coins className={`${isLarge ? 'h-5 w-5' : 'h-4 w-4'} text-yellow-500`} />;
      case 'gold': return <span className={`${isLarge ? 'text-xl' : 'base'}`}>💰</span>;
      default: return <span className={`${isLarge ? 'text-xl' : 'base'}`}>$</span>;
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {getSymbol(currencyCode)}
      <span className={`${isLarge ? 'text-xl' : 'text-base'} font-bold text-yellow-600`}>
        {formatCredits(amount)}
      </span>
    </div>
  );
}
