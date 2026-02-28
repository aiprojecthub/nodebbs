import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useEffect } from 'react';
import { ArrowRight, ShoppingBag } from 'lucide-react';

/**
 * 道具购买成功动画对话框
 * @param {Object} props
 * @param {boolean} props.open
 * @param {Function} props.onOpenChange
 * @param {Object} props.item - 购买的商品对象
 * @param {Function} props.onView - 点击"去查看"的回调
 * @param {Function} props.onStay - 点击"留在本页"的回调
 */
export function ItemPurchaseSuccessDialog({ 
  open, 
  onOpenChange, 
  item,
  onView,
  onStay 
}) {
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        fireConfetti();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const fireConfetti = () => {
    const count = 100;
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 9999,
      colors: ['#10b981', '#14b8a6', '#84cc16'] // Emerald, Teal, Lime
    };

    function fire(particleRatio, opts) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
    });
    fire(0.2, {
      spread: 60,
    });
    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
    });
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-0 bg-transparent shadow-none" showCloseButton={false}>
        <div className="relative flex flex-col items-center justify-center p-6 bg-linear-to-br from-emerald-500/80 to-teal-600/80 backdrop-blur-xl border border-emerald-400/30 rounded-xl overflow-hidden shadow-2xl">
          
          {/* 光效 */}
          <div className="absolute inset-0 bg-linear-to-tr from-transparent via-white/10 to-transparent animate-pulse pointer-events-none" />

          {/* 道具动画 */}
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 20,
              duration: 0.5
            }}
            className="relative w-32 h-32 mb-6"
          >
            {/* 道具背后的发光 */}
            <div className="absolute inset-0 bg-white/20 blur-3xl rounded-full" />
            
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={item.name}
                className="relative w-full h-full object-contain drop-shadow-2xl"
              />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-white/10 rounded-full border border-white/20">
                    <ShoppingBag className="w-16 h-16 text-white" />
                </div>
            )}
          </motion.div>

          {/* 文本内容 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center space-y-2 z-10"
          >
            <h2 className="text-2xl font-bold text-white tracking-wider drop-shadow-md">
              购买成功！
            </h2>
            <h3 className="text-xl font-semibold text-emerald-50">
              {item.name}
            </h3>
            <p className="text-sm text-emerald-100/90 max-w-[250px] mx-auto font-medium">
              恭喜，你已成功购买此道具。
            </p>
          </motion.div>

          {/* 操作按钮 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-8 z-10 flex flex-col gap-3 w-full max-w-xs"
          >
             <Button 
               className="w-full bg-white text-emerald-600 hover:bg-emerald-50 font-bold border-0 shadow-lg"
               onClick={onView}
             >
               去查看我的道具
               <ArrowRight className="ml-2 h-4 w-4" />
             </Button>
             
             <Button 
                variant="ghost" 
                className="w-full text-emerald-100 hover:text-white hover:bg-white/10"
                onClick={onStay}
             >
                留在本页
             </Button>
          </motion.div>
        
        </div>
      </DialogContent>
    </Dialog>
  );
}
