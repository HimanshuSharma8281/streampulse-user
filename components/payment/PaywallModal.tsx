'use client';

import React, { useState } from 'react';
import { Lock, Sparkles, CheckCircle2, Shield, CreditCard, Zap } from 'lucide-react';

interface PaywallModalProps {
  isOpen: boolean;
  streamTitle: string;
  onUnlock: () => void;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({
  isOpen,
  streamTitle,
  onUnlock,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);

  if (!isOpen) return null;

  const handlePay = () => {
    setIsProcessing(true);
    // Simulate payment transaction (Razorpay / UPI / Stripe)
    setTimeout(() => {
      setIsProcessing(false);
      setPaymentDone(true);
      setTimeout(() => {
        onUnlock();
      }, 1200);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#12141c] border border-rose-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-rose-600/20 rounded-full blur-2xl pointer-events-none" />

        <div className="text-center space-y-3 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-500 shadow-lg shadow-rose-600/20">
            {paymentDone ? <CheckCircle2 className="w-8 h-8 text-emerald-400" /> : <Lock className="w-7 h-7" />}
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> Premium Live Stream Pass
          </span>

          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Unlock Full Live Stream Access
          </h2>

          <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
            {streamTitle}
          </p>

          {/* Pricing Box */}
          <div className="bg-[#181b26] border border-white/10 rounded-2xl p-4 my-4 flex items-center justify-between">
            <div className="text-left">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">Pay-Per-Stream</span>
              <div className="text-2xl font-extrabold text-white flex items-baseline gap-1">
                <span>₹5</span>
                <span className="text-xs text-slate-400 font-normal">/ stream</span>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
              Instant Access
            </span>
          </div>

          {/* Features */}
          <div className="text-left text-xs text-slate-300 space-y-2 pb-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-rose-400" />
              <span>1080p Ultra HD low-latency stream</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Full live chat & emoji reactions</span>
            </div>
          </div>

          {/* Action button */}
          <button
            onClick={handlePay}
            disabled={isProcessing || paymentDone}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-bold text-sm tracking-wide shadow-lg shadow-rose-600/30 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : paymentDone ? (
              <span>Unlocked! Loading stream...</span>
            ) : (
              <>
                <Zap className="w-4 h-4 fill-current" />
                <span>Pay ₹5 & Watch Live</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
