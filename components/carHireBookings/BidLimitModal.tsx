"use client";

import { Crown } from 'lucide-react';

interface BidLimitModalProps {
  limit: number;
  onClose: () => void;
  onUpgrade: () => void;
}

export default function BidLimitModal({
  limit,
  onClose,
  onUpgrade
}: BidLimitModalProps) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[150] backdrop-blur-md">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scaleIn border border-amber-500/30">
        <div className="p-6 text-center">
          <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-amber-500">
            <Crown className="w-10 h-10 text-amber-500" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">Bidding Limit Reached!</h3>
          <p className="text-gray-300 mb-4">
            You have exhausted your <span className="font-bold text-amber-400">{limit}</span> monthly bids.
          </p>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-6">
            <p className="text-sm text-gray-300">
              Upgrade to VIP to get more bids and unlock premium features!
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-700 text-gray-300 rounded-xl hover:bg-gray-600 transition-colors font-bold"
            >
              Cancel
            </button>
            <button
              onClick={onUpgrade}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all font-bold shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2"
            >
              <Crown className="w-4 h-4" />
              Upgrade VIP
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
