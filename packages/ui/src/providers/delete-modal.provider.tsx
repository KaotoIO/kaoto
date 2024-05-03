import { Button, Modal, ModalVariant } from '@patternfly/react-core';
import { FunctionComponent, PropsWithChildren, createContext, useCallback, useMemo, useRef, useState } from 'react';

interface DeleteModalContextValue {
  deleteConfirmation: (options: { title?: string; text?: string }) => Promise<boolean>;
}

export const DeleteModalContext = createContext<DeleteModalContextValue | undefined>(undefined);

/**
 * This provider is used to open the Delete Confirmation modal.
 * The modal loads when the user clicks on the delete Routes/Kamelets of remove any Step from the Context Menu.
 */
export const DeleteModalContextProvider: FunctionComponent<PropsWithChildren> = (props) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');

  const deleteConfirmationRef = useRef<{
    resolve: (confirm: boolean) => void;
    reject: (error: unknown) => unknown;
  }>();

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    deleteConfirmationRef.current?.resolve(false);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    setIsModalOpen(false);
    deleteConfirmationRef.current?.resolve(true);
  }, []);

  const deleteConfirmation = useCallback((options: { title?: string; text?: string } = {}) => {
    const deleteConfirmationPromise = new Promise<boolean>((resolve, reject) => {
      /** Set both resolve and reject functions to be used once the user choose an action */
      deleteConfirmationRef.current = { resolve, reject };
    });

    setTitle(options.title || 'Delete?');
    setText(options.text || 'Are you sure you want to delete?');
    setIsModalOpen(true);

    return deleteConfirmationPromise;
  }, []);

  const value: DeleteModalContextValue = useMemo(
    () => ({
      deleteConfirmation,
    }),
    [deleteConfirmation],
  );

  return (
    <DeleteModalContext.Provider value={value}>
      {props.children}

      {isModalOpen && (
        <Modal
          isOpen
          variant={ModalVariant.small}
          title={title}
          titleIconVariant={'warning'}
          onClose={handleCloseModal}
          ouiaId="DeleteConfirmModal"
          actions={[
            <Button key="confirm" variant="danger" onClick={handleDeleteConfirm}>
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
    </DeleteModalContext.Provider>
  );
};
