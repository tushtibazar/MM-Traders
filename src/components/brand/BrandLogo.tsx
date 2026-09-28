import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  lightText?: boolean;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showSubtitle = true,
  lightText = false,
  className = '',
}) => {
  const sizeMap = {
    sm: { img: 'h-8 w-8', title: 'text-sm', sub: 'text-[10px]' },
    md: { img: 'h-10 w-10', title: 'text-base', sub: 'text-[11px]' },
    lg: { img: 'h-12 w-12', title: 'text-lg', sub: 'text-xs' },
    xl: { img: 'h-16 w-16', title: 'text-2xl', sub: 'text-sm' },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Official MM TRADERS emblem */}
      <div
        className={`${currentSize.img} shrink-0 relative overflow-hidden rounded-xl bg-slate-900 border border-amber-400/40 shadow-md flex items-center justify-center`}
      >
        <img
          src="/mm_traders_logo.jpg"
          alt="MM TRADERS DISTRIBUTOR"
          className="h-full w-full object-cover"
          onError={(e) => {
            // Fallback crisp SVG if image loading has issues
            const target = e.currentTarget;
            target.style.display = 'none';
            if (target.parentElement) {
              target.parentElement.innerHTML = `
                <div class="h-full w-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 text-amber-400 font-black">
                  <span class="text-xs tracking-wider leading-none">MM</span>
                  <span class="text-[7px] text-slate-300 font-bold tracking-tight">TRADERS</span>
                </div>
              `;
            }
          }}
        />
      </div>

      <div className="overflow-hidden min-w-0">
        <h1
          className={`font-black tracking-tight leading-none uppercase ${currentSize.title} ${
            lightText ? 'text-white' : 'text-slate-900'
          }`}
        >
          MM TRADERS
        </h1>
        {showSubtitle && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={`font-extrabold tracking-widest text-[10px] uppercase px-1.5 py-0.2 rounded ${
                lightText
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                  : 'bg-amber-100 text-amber-900 border border-amber-200'
              }`}
            >
              DISTRIBUTOR
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
