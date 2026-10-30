import { Button, ComposedModal, ModalBody, ModalFooter, ModalHeader } from '@carbon/react';
import { FunctionComponent, PropsWithChildren, RefObject } from 'react';

export interface EditorModalProps extends PropsWithChildren {
  open: boolean;
  title: string;
  /** Test id of the modal. The buttons get `${testId}-cancel-btn` and `${testId}-add-btn`. */
  testId: string;
  /** Label of the primary button. Default: 'Add'. */
  submitLabel?: string;
  /** Element that Carbon restores focus to when the modal closes. */
  launcherButtonRef?: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  /** Called when the primary button is clicked. The caller decides whether to close the modal. */
  onSubmit: () => void;
}

/**
 * Small modal shell shared by the editors' "add" dialogs: header, body slot and Cancel/primary footer.
 */
export const EditorModal: FunctionComponent<EditorModalProps> = ({
  open,
  title,
  testId,
  submitLabel = 'Add',
  launcherButtonRef,
  onClose,
  onSubmit,
  children,
}) => {
  return (
    <ComposedModal open={open} launcherButtonRef={launcherButtonRef} size="sm" onClose={onClose} data-testid={testId}>
      <ModalHeader title={title} />

      <ModalBody>{children}</ModalBody>

      <ModalFooter>
        <Button kind="secondary" onClick={onClose} data-testid={`${testId}-cancel-btn`}>
          Cancel
        </Button>
        <Button kind="primary" onClick={onSubmit} data-testid={`${testId}-add-btn`}>
          {submitLabel}
        </Button>
      </ModalFooter>
    </ComposedModal>
  );
};
