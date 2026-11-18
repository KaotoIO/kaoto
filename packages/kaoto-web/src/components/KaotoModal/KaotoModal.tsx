import { ComposedModal, ModalBody, ModalFooter, ModalHeader } from '@carbon/react';
import { FunctionComponent, PropsWithChildren, ReactNode, useCallback, useLayoutEffect, useRef } from 'react';

interface KaotoModalProps {
  /** Shown in the header; also names the dialog for screen readers */
  title: string;
  /** Called on Escape, the close button and the footer actions that close the modal */
  onClose: () => void;
  /** The footer actions; the modal has no footer without them */
  footer?: ReactNode;
  /** While set, Escape and the close button keep the modal open, e.g. while an action is running */
  preventClose?: boolean;
  open?: boolean;
  danger?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Set when the body holds a form, so that Carbon removes the body's right padding */
  hasForm?: boolean;
  preventCloseOnClickOutside?: boolean;
  /** Selector of the element that takes the focus when the modal opens */
  selectorPrimaryFocus?: string;
  className?: string;
  'data-testid'?: string;
}

/**
 * The Carbon modal kaoto-web uses: a header with the title, the content as body and optional footer actions.
 *
 * Render it only while it is open, unless `open` is set. Carbon names the dialog only when it is told to, so the
 * title is set as its label.
 */
export const KaotoModal: FunctionComponent<PropsWithChildren<KaotoModalProps>> = ({
  title,
  onClose,
  footer,
  preventClose = false,
  open = true,
  danger,
  size,
  hasForm,
  preventCloseOnClickOutside,
  selectorPrimaryFocus,
  className,
  'data-testid': dataTestId = 'kaoto-modal',
  children,
}) => {
  /** Carbon's Escape listener keeps the close handler of the first render, so the handler reads the latest props */
  const latest = useRef({ onClose, preventClose });
  useLayoutEffect(() => {
    latest.current = { onClose, preventClose };
  });

  const handleClose = useCallback(() => {
    if (latest.current.preventClose) return false;
    latest.current.onClose();
    return true;
  }, []);

  return (
    <ComposedModal
      open={open}
      danger={danger}
      size={size}
      onClose={handleClose}
      preventCloseOnClickOutside={preventCloseOnClickOutside}
      selectorPrimaryFocus={selectorPrimaryFocus}
      aria-label={title}
      className={className}
      data-testid={dataTestId}
    >
      <ModalHeader title={title} />
      <ModalBody hasForm={hasForm}>{children}</ModalBody>
      {footer && <ModalFooter>{footer}</ModalFooter>}
    </ComposedModal>
  );
};
