import { MouseEvent, RefObject, useCallback, useEffect, useRef, useState } from 'react';

interface ContextMenuState {
  isMenuOpen: boolean;
  menuPosition: { x: number; y: number };
  menuRef: RefObject<HTMLDivElement | null>;
  closeMenu: () => void;
  openMenu: (event: MouseEvent) => void;
}

export function useContextMenuState(): ContextMenuState {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  useEffect(() => {
    if (!isMenuOpen) return;

    const handleDismiss = (e: globalThis.MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    const handleEscape = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };

    document.addEventListener('mousedown', handleDismiss);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleDismiss);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMenuOpen]);

  const openMenu = useCallback((event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setMenuPosition({ x: event.clientX, y: event.clientY });
    setIsMenuOpen(true);
  }, []);

  return { isMenuOpen, menuPosition, menuRef, closeMenu, openMenu };
}
