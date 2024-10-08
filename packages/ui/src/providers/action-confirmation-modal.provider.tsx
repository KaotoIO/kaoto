import { Button, ButtonVariant, Modal, ModalVariant } from '@patternfly/react-core';
import { FunctionComponent, PropsWithChildren, createContext, useCallback, useMemo, useRef, useState } from 'react';

export const ACTION_INDEX_CANCEL = 0;
export const ACTION_INDEX_CONFIRM = 1;
export interface ActionConfirmationButtonOption {
  index: number;
  buttonText: string;
  variant: ButtonVariant;
  isDanger?: boolean;
}

interface ActionConfirmationModalContextValue {
  actionConfirmation: (options: {
    title?: string;
    text?: string;
    buttonOptions?: ActionConfirmationButtonOption[];
    additionalModalText?: string;
  }) => Promise<number>;
}

export const ActionConfirmationModalContext = createContext<ActionConfirmationModalContextValue | undefined>(undefined);

/**
 * This provider is used to open the Action Confirmation modal.
 * The modal loads when the user clicks on the delete Routes/Kamelets or remove/replace any Step from the Context Menu.
 */
export const ActionConfirmationModalContextProvider: FunctionComponent<PropsWithChildren> = (props) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [textParagraphs, setTextParagraphs] = useState<string[]>([]);
  const [buttonOptions, setButtonOptions] = useState<ActionConfirmationButtonOption[]>([]);
  const actionConfirmationRef = useRef<{
    resolve: (index: number) => void;
    reject: (error: unknown) => unknown;
  }>();

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    actionConfirmationRef.current?.resolve(ACTION_INDEX_CANCEL);
  }, []);

  const handleAction = useCallback((index: number) => {
    setIsModalOpen(false);
    actionConfirmationRef.current?.resolve(index);
  }, []);

  const actionConfirmation = useCallback(
    (
      options: {
        title?: string;
        text?: string;
        additionalModalText?: string;
        buttonOptions?: ActionConfirmationButtonOption[];
      } = {},
    ) => {
      const actionConfirmationPromise = new Promise<number>((resolve, reject) => {
        /** Set both resolve and reject functions to be used once the user choose an action */
        actionConfirmationRef.current = { resolve, reject };
      });

      setTitle(options.title ?? 'Delete?');
      const textParagraphs = [options.text ?? 'Are you sure you want to delete?'];
      if (options.additionalModalText) {
        textParagraphs.push(options.additionalModalText);
      }
      setTextParagraphs(textParagraphs);
      options.buttonOptions
        ? setButtonOptions(options.buttonOptions)
        : setButtonOptions([{ index: ACTION_INDEX_CONFIRM, buttonText: 'Confirm', variant: ButtonVariant.danger }]);
      setIsModalOpen(true);

      return actionConfirmationPromise;
    },
    [],
  );

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
            ...buttonOptions.map((op) => (
              <Button
                key={op.index}
                variant={op.variant}
                onClick={() => handleAction(op.index)}
                data-testid={`action-confirmation-modal-btn-${op.index}`}
                isDanger={op.isDanger}
              >
                {op.buttonText}
              </Button>
            )),
            <Button
              key="cancel"
              variant="link"
              onClick={handleCloseModal}
              data-testid={`action-confirmation-modal-btn-${ACTION_INDEX_CANCEL}`}
            >
              Cancel
            </Button>,
          ]}
        >
          {textParagraphs.length === 1
            ? textParagraphs[0]
            : textParagraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
        </Modal>
      )}
    </ActionConfirmationModalContext.Provider>
  );
};
