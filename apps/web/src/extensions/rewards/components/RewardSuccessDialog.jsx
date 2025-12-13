import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useEffect } from 'react';
import { Heart } from 'lucide-react';

/**
 * 打赏成功动画对话框
 * @param {Object} props
 * @param {boolean} props.open
 * @param {Function} props.onOpenChange
 * @param {number} props.amount - 打赏金额
 */
export function RewardSuccessDialog({ open, onOpenChange, amount }) {
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        fireConfetti();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const fireConfetti = () => {
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 9999,
    };

    function fire(particleRatio, opts) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(200 * particleRatio),
      });
    }

    // Level 1: Small (< 10) - Simple burst
    if (amount < 10) {
      fire(0.5, {
        spread: 40,
        startVelocity: 45,
        scalar: 0.8,
        colors: ['#FFD700', '#FFA500']
      });
      return;
    }

    // Level 2: Medium (10 - 99) - Standard celebration
    if (amount < 100) {
      fire(0.25, { spread: 26, startVelocity: 55, colors: ['#FFD700', '#FFA500', '#FF6347'] });
      fire(0.2, { spread: 60, colors: ['#FFD700', '#FFA500', '#FF6347'] });
      fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8, colors: ['#FFD700', '#FFA500', '#FF6347'] });
      fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2, colors: ['#FFD700', '#FFA500', '#FF6347'] });
      fire(0.1, { spread: 120, startVelocity: 45, colors: ['#FFD700', '#FFA500', '#FF6347'] });
      return;
    }

    // Level 3: Large (100 - 499) - Big explosion with more colors
    if (amount < 500) {
      const colors = ['#FFD700', '#FFA500', '#FF6347', '#FF4500', '#DC143C'];
      fire(0.3, { spread: 60, startVelocity: 60, colors });
      fire(0.3, { spread: 100, decay: 0.90, scalar: 1.0, colors });
      fire(0.2, { spread: 140, startVelocity: 30, decay: 0.90, scalar: 1.2, colors });
      
      // Secondary burst
      setTimeout(() => {
        fire(0.2, { spread: 120, startVelocity: 45, colors });
      }, 200);
      return;
    }

    // Level 4: Huge (500+) - Fireworks style
    const end = Date.now() + 1000;
    const colors = ['#FFD700', '#FFA500', '#FF4500', '#FF0000', '#FFFFFF'];

    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors,
        zIndex: 9999,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors,
        zIndex: 9999,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-0 bg-transparent shadow-none" showCloseButton={false}>
        <div className="relative flex flex-col items-center justify-center p-6 bg-zinc-950/40 backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/5">
          
          {/* 现代感背景流光 */}
          <div className="absolute inset-0 bg-gradient-to-tr from-rose-500/10 via-transparent to-orange-500/10 pointer-events-none" />
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-rose-500/20 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-orange-500/20 rounded-full blur-[80px] pointer-events-none" />

          {/* 爱心动画 */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 15,
              duration: 0.6
            }}
            className="relative w-32 h-32 mb-6 flex items-center justify-center"
          >
             {/* 中心发光 */}
             <div className="absolute inset-0 bg-gradient-to-br from-rose-500 to-orange-500 blur-2xl opacity-40 rounded-full" />
             <Heart size={80} className="text-white fill-rose-500 drop-shadow-lg z-10" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center space-y-1 z-10"
          >
            <h2 className="text-3xl font-black bg-gradient-to-br from-white to-white/70 bg-clip-text text-transparent tracking-tight">
              打赏成功
            </h2>
            <div className="h-1" />
            <h3 className="text-lg font-medium text-rose-200/90 flex items-center justify-center gap-2">
              <span className="text-2xl font-bold text-white">{amount}</span> 积分已送达
            </h3>
            <p className="text-sm text-zinc-400 mt-2 max-w-[200px] mx-auto leading-relaxed">
              您的支持是创作者最大的动力
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
               className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-400 hover:to-pink-500 text-white font-semibold border-0 shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:shadow-[0_0_30px_rgba(239,68,68,0.6)]"
               onClick={() => onOpenChange(false)}
             >
               关闭
             </Button>
          </motion.div>
        
        </div>
      </DialogContent>
    </Dialog>
  );
}
