import { Coins } from 'lucide-react';
import { formatCredits } from '../../utils/formatters';
import { DEFAULT_CURRENCY_CODE } from '../../constants';
import { useLedger } from '../../contexts/LedgerContext';

/**
 * 显示货币金额
 * 优先用 symbol 作为前缀图标，symbol 为空时 fallback 到 Coins 图标 + name 后缀
 */
export function CreditsBadge({ amount, currencyCode = DEFAULT_CURRENCY_CODE, variant = 'default', className = '' }) {
  const isLarge = variant === 'large';
  const { currencies } = useLedger();

  const currency = currencies.find(c => c.code === currencyCode);
  const symbol = currency?.symbol;
  const name = currency?.name || currencyCode;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {symbol ? (
        <span className={isLarge ? 'text-lg' : 'text-sm'}>{symbol}</span>
      ) : (
        <Coins className={`${isLarge ? 'h-5 w-5' : 'h-4 w-4'} text-yellow-500`} />
      )}
      <span className={`${isLarge ? 'text-xl' : 'text-base'} font-bold text-yellow-600`}>
        {formatCredits(amount)}
      </span>
      {!symbol && (
        <span className={`${isLarge ? 'text-sm' : 'text-xs'} text-muted-foreground font-normal`}>
          {name}
        </span>
      )}
    </div>
  );
}
