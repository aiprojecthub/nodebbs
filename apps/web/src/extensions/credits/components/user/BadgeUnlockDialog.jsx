import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useEffect } from 'react';

/**
 * 徽章解锁动画对话框
 * @param {Object} props
 * @param {boolean} props.open
 * @param {Function} props.onOpenChange
 * @param {Object} props.badgeItem - 徽章商品对象
 */
export function BadgeUnlockDialog({ open, onOpenChange, badgeItem }) {
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        fireConfetti();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const fireConfetti = () => {
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 9999, // 确保在对话框之上
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
    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 45,
    });
  };

  if (!badgeItem) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-0 bg-transparent shadow-none">
        <div className="relative flex flex-col items-center justify-center p-6 bg-gradient-to-br from-yellow-500/10 to-amber-500/10 backdrop-blur-xl border border-yellow-500/20 rounded-xl overflow-hidden">
          
          {/* 光效 */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-yellow-500/5 to-transparent animate-pulse pointer-events-none" />

          {/* 徽章动画 */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 20,
              duration: 0.5
            }}
            className="relative w-40 h-40 mb-6"
          >
            {/* 徽章背后的发光 */}
            <div className="absolute inset-0 bg-yellow-500/30 blur-3xl rounded-full" />
            
            <img
              src={badgeItem.imageUrl}
              alt={badgeItem.name}
              className="relative w-full h-full object-contain drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center space-y-2 z-10"
          >
            <h2 className="text-2xl font-bold text-yellow-500 tracking-wider uppercase">
              Badge Unlocked!
            </h2>
            <h3 className="text-xl font-semibold text-white">
              {badgeItem.name}
            </h3>
            <p className="text-sm text-yellow-200/80 max-w-[250px] mx-auto">
              {badgeItem.description || "You've collected a new badge!"}
            </p>
          </motion.div>

          {/* 操作按钮 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-8 z-10"
          >
             <Button 
               className="bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black font-semibold border-0 shadow-[0_0_20px_rgba(234,179,8,0.4)] hover:shadow-[0_0_30px_rgba(234,179,8,0.6)]"
               onClick={() => onOpenChange(false)}
             >
               Awesome!
             </Button>
          </motion.div>
        
        </div>
      </DialogContent>
    </Dialog>
  );
}
