import { useCallback, useState } from 'react';

export interface UseKeyedModalResult {
  isOpen: boolean;
  /** Changes on every open() so the modal remounts with empty fields. Use it as the React `key`. */
  modalKey: number;
  /**
   * False until the modal has been opened once. Render the modal only when this is true: Carbon's
   * ComposedModal restores focus to the launcher whenever it is mounted while closed, so mounting it
   * eagerly would steal focus on page load.
   */
  shouldRender: boolean;
  open: () => void;
  close: () => void;
}

export const useKeyedModal = (): UseKeyedModalResult => {
  const [isOpen, setIsOpen] = useState(false);
  const [modalKey, setModalKey] = useState(0);

  const open = useCallback(() => {
    setModalKey((key) => key + 1);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  return { isOpen, modalKey, shouldRender: modalKey > 0, open, close };
};
