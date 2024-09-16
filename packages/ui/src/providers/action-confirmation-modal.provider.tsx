import { Button, Modal, ModalVariant } from '@patternfly/react-core';
import { FunctionComponent, PropsWithChildren, createContext, useCallback, useMemo, useRef, useState } from 'react';

interface ActionConfirmationModalContextValue {
  actionConfirmation: (options: { title?: string; text?: string }) => Promise<boolean>;
}

export const ActionConfirmationModalContext = createContext<ActionConfirmationModalContextValue | undefined>(undefined);

/**
 * This provider is used to open the Action Confirmation modal.
 * The modal loads when the user clicks on the delete Routes/Kamelets or remove/replace any Step from the Context Menu.
 */
export const ActionConfirmationModalContextProvider: FunctionComponent<PropsWithChildren> = (props) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');

  const actionConfirmationRef = useRef<{
    resolve: (confirm: boolean) => void;
    reject: (error: unknown) => unknown;
  }>();

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    actionConfirmationRef.current?.resolve(false);
  }, []);

  const handleActionConfirm = useCallback(() => {
    setIsModalOpen(false);
    actionConfirmationRef.current?.resolve(true);
  }, []);

  const actionConfirmation = useCallback((options: { title?: string; text?: string } = {}) => {
    const actionConfirmationPromise = new Promise<boolean>((resolve, reject) => {
      /** Set both resolve and reject functions to be used once the user choose an action */
      actionConfirmationRef.current = { resolve, reject };
    });

    setTitle(options.title ?? 'Delete?');
    setText(options.text ?? 'Are you sure you want to delete?');
    setIsModalOpen(true);

    return actionConfirmationPromise;
  }, []);

  const value: ActionConfirmationModalContextValue = useMemo(
    () => ({
      actionConfirmation: actionConfirmation,
    }),
    [actionConfirmation],
  );

  return (
    <ActionConfirmationModalContext.Provider value={value}>
      {props.children}

      {isModalOpen && (
        <Modal
          isOpen
          variant={ModalVariant.small}
          title={title}
          titleIconVariant={'warning'}
          onClose={handleCloseModal}
          ouiaId="ActionConfirmationModal"
          actions={[
            <Button key="confirm" variant="danger" onClick={handleActionConfirm}>
              Confirm
            </Button>,
            <Button key="cancel" variant="link" onClick={handleCloseModal}>
              Cancel
            </Button>,
          ]}
        >
          {text}
        </Modal>
      )}
    </ActionConfirmationModalContext.Provider>
  );
};
