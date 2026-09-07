import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SlidingOptionsRowProps {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  scrollStep?: number;
  showArrows?: boolean;
  showGradients?: boolean;
  activeItemId?: string;
}

export const SlidingOptionsRow: React.FC<SlidingOptionsRowProps> = ({
  children,
  className = '',
  containerClassName = '',
  scrollStep = 260,
  showArrows = true,
  showGradients = true,
  activeItemId
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Check scroll position and boundaries
  const updateScrollBounds = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateScrollBounds();
    const el = scrollRef.current;
    if (!el) return;

    el.addEventListener('scroll', updateScrollBounds, { passive: true });
    const ro = new ResizeObserver(() => {
      updateScrollBounds();
    });
    ro.observe(el);

    return () => {
      el.removeEventListener('scroll', updateScrollBounds);
      ro.disconnect();
    };
  }, [updateScrollBounds, children]);

  // Scroll to active element if activeItemId changes
  useEffect(() => {
    if (!activeItemId || !scrollRef.current) return;
    const activeEl = scrollRef.current.querySelector(`[data-active="true"], [data-id="${activeItemId}"]`);
    if (activeEl && 'scrollIntoView' in activeEl) {
      activeEl.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
      // Small delay to recompute bounds after smooth scroll
      setTimeout(updateScrollBounds, 350);
    }
  }, [activeItemId, updateScrollBounds]);

  const handleScroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const offset = direction === 'left' ? -scrollStep : scrollStep;
    el.scrollBy({ left: offset, behavior: 'smooth' });
    setTimeout(updateScrollBounds, 350);
  };

  return (
    <div 
      className={`relative group/slider w-full flex items-center ${containerClassName}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Left Slide Arrow Button */}
      {showArrows && canScrollLeft && (
        <button
          type="button"
          onClick={() => handleScroll('left')}
          title="Faire défiler les options vers la gauche"
          aria-label="Options précédentes"
          className="absolute left-0 z-20 w-8 h-8 -ml-1 rounded-full bg-[#0d101c]/95 hover:bg-amber-500 text-gray-300 hover:text-black border border-white/20 shadow-lg shadow-black/80 flex items-center justify-center transition-all cursor-pointer active:scale-90"
        >
          <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
        </button>
      )}

      {/* Left Gradient Fade Mask */}
      {showGradients && canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-[#0c0e17] via-[#0c0e17]/80 to-transparent pointer-events-none z-10 rounded-l-xl transition-opacity" />
      )}

      {/* Sliding Scrollable Row */}
      <div
        ref={scrollRef}
        className={`w-full flex items-center gap-1.5 sm:gap-2 overflow-x-auto scroll-smooth no-scrollbar select-none py-0.5 px-0.5 ${className}`}
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {children}
      </div>

      {/* Right Gradient Fade Mask */}
      {showGradients && canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-[#0c0e17] via-[#0c0e17]/80 to-transparent pointer-events-none z-10 rounded-r-xl transition-opacity" />
      )}

      {/* Right Slide Arrow Button */}
      {showArrows && canScrollRight && (
        <button
          type="button"
          onClick={() => handleScroll('right')}
          title="Faire défiler les options vers la droite"
          aria-label="Options suivantes"
          className="absolute right-0 z-20 w-8 h-8 -mr-1 rounded-full bg-[#0d101c]/95 hover:bg-amber-500 text-gray-300 hover:text-black border border-white/20 shadow-lg shadow-black/80 flex items-center justify-center transition-all cursor-pointer active:scale-90"
        >
          <ChevronRight className="w-4 h-4 stroke-[2.5]" />
        </button>
      )}
    </div>
  );
};
