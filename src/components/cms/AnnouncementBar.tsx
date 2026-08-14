import { useState } from 'react';
import { X } from 'lucide-react';
import { useActiveAnnouncementBar } from '@/cms/hooks/useCMSPage';

export default function AnnouncementBar() {
  const bar = useActiveAnnouncementBar();
  const [dismissed, setDismissed] = useState(false);

  if (!bar || dismissed) return null;

  const msg = bar.message || "FREE SHIPPING ON ORDERS OVER ₹2,500";

  return (
    <div
      className="w-full py-2.5 bg-black text-white overflow-hidden relative border-b border-white/10 z-50 flex items-center justify-between px-4"
    >
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <div className="whitespace-nowrap flex items-center gap-8 text-[11px] font-ui font-normal tracking-[0.15em] text-white/90">
          <span>• {msg}</span>
          <span>• {msg}</span>
          <span className="hidden sm:inline">• {msg}</span>
          <span className="hidden md:inline">• {msg}</span>
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="opacity-60 hover:opacity-100 transition-opacity ml-2"
        aria-label="Dismiss announcement"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
