import React, { useState, useEffect, RefObject, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CustomScrollBarProps {
  scrollContainerRef: RefObject<HTMLDivElement>;
}

const CustomScrollBar: React.FC<CustomScrollBarProps> = ({ scrollContainerRef }) => {
  const [scrollState, setScrollState] = useState({
    canScrollLeft: false,
    canScrollRight: false,
    isScrollable: false,
  });
  const [thumbStyle, setThumbStyle] = useState({ width: '0%', marginLeft: '0%' });

  const updateScrollState = useCallback(() => {
    const container = scrollContainerRef.current;
    if (container) {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      const isScrollable = scrollWidth > clientWidth;

      setScrollState({
        canScrollLeft: isScrollable && scrollLeft > 0,
        canScrollRight: isScrollable && scrollLeft < scrollWidth - clientWidth - 1,
        isScrollable,
      });

      if (isScrollable) {
        const thumbWidth = (clientWidth / scrollWidth) * 100;
        const thumbPosition = (scrollLeft / scrollWidth) * 100;
        setThumbStyle({
          width: `${thumbWidth}%`,
          marginLeft: `${thumbPosition}%`,
        });
      }
    }
  }, [scrollContainerRef]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      updateScrollState();
      container.addEventListener('scroll', updateScrollState);
      const resizeObserver = new ResizeObserver(updateScrollState);
      resizeObserver.observe(container);
      
      const mutationObserver = new MutationObserver(updateScrollState);
      mutationObserver.observe(container, { childList: true, subtree: true });

      return () => {
        container.removeEventListener('scroll', updateScrollState);
        resizeObserver.disconnect();
        mutationObserver.disconnect();
      };
    }
  }, [updateScrollState]);

  const handleScroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (container) {
      const scrollAmount = container.clientWidth * 0.8;
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (!scrollState.isScrollable) {
    return null;
  }

  return (
    <div className="flex items-center space-x-2 mt-2 px-2">
      <button
        onClick={() => handleScroll('left')}
        disabled={!scrollState.canScrollLeft}
        className="text-gray-500 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft size={20} />
      </button>
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full">
        <div
          className="h-full bg-gray-400 rounded-full transition-all duration-100"
          style={thumbStyle}
        ></div>
      </div>
      <button
        onClick={() => handleScroll('right')}
        disabled={!scrollState.canScrollRight}
        className="text-gray-500 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
};

export default CustomScrollBar;
