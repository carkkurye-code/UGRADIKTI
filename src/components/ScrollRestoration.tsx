import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';

const SCROLL_PREFIX = 'ugra_scroll_pos:';

export function ScrollRestoration() {
  const [location] = useLocation();
  const prevLocationRef = useRef<string>(location);
  const isPopStateRef = useRef<boolean>(false);

  // Enable manual scroll restoration on browser history
  useEffect(() => {
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    const handlePopState = () => {
      isPopStateRef.current = true;
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Save current window scroll position continuously during scroll
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentPath = window.location.pathname + window.location.search;
          sessionStorage.setItem(`${SCROLL_PREFIX}${currentPath}`, String(window.scrollY));
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [location]);

  // Handle route change: save previous path scroll, restore target path scroll
  useEffect(() => {
    const currentPath = window.location.pathname + window.location.search;
    const prevPath = prevLocationRef.current;

    if (prevPath && prevPath !== currentPath) {
      sessionStorage.setItem(`${SCROLL_PREFIX}${prevPath}`, String(window.scrollY));
    }

    prevLocationRef.current = currentPath;

    const savedPos = sessionStorage.getItem(`${SCROLL_PREFIX}${currentPath}`);
    const isPop = isPopStateRef.current;
    isPopStateRef.current = false; // Reset flag

    if (savedPos !== null && (isPop || Number(savedPos) > 0)) {
      const targetY = parseInt(savedPos, 10) || 0;

      let attempts = 0;
      const maxAttempts = 20;

      const restoreScroll = () => {
        window.scrollTo({ top: targetY, behavior: 'instant' as ScrollBehavior });

        const currentY = window.scrollY;
        const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

        if (Math.abs(currentY - targetY) <= 5 || (maxScroll > 0 && currentY >= maxScroll && targetY >= maxScroll)) {
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(restoreScroll, 50);
        }
      };

      restoreScroll();
      setTimeout(restoreScroll, 100);
      setTimeout(restoreScroll, 300);
      setTimeout(restoreScroll, 600);
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  }, [location]);

  return null;
}
