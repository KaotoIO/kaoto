import { Button, ButtonVariant, Modal, ModalVariant, Split, SplitItem } from '@patternfly/react-core';
import { FunctionComponent, PropsWithChildren, createContext, useCallback, useMemo, useRef, useState } from 'react';

export const ACTION_ID_CANCEL = 'cancel';
export const ACTION_ID_CONFIRM = 'confirm';
export interface ActionConfirmationButtonOption {
  buttonText: string;
  variant: ButtonVariant;
  isDanger?: boolean;
}

interface ActionConfirmationModalContextValue {
  actionConfirmation: (options: {
    title?: string;
    text?: string;
    buttonOptions?: Record<string, ActionConfirmationButtonOption>;
    additionalModalText?: string;
  }) => Promise<string>;
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
  const [buttonOptions, setButtonOptions] = useState<Record<string, ActionConfirmationButtonOption>>({});
  const actionConfirmationRef = useRef<{
    resolve: (actionId: string) => void;
    reject: (error: unknown) => unknown;
  }>();

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    actionConfirmationRef.current?.resolve(ACTION_ID_CANCEL);
  }, []);

  const handleAction = useCallback((actionId: string) => {
    setIsModalOpen(false);
    actionConfirmationRef.current?.resolve(actionId);
  }, []);

  const actionConfirmation = useCallback(
    (
      options: {
        title?: string;
        text?: string;
        additionalModalText?: string;
        buttonOptions?: Record<string, ActionConfirmationButtonOption>;
      } = {},
    ) => {
      const actionConfirmationPromise = new Promise<string>((resolve, reject) => {
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
        : setButtonOptions({ [ACTION_ID_CONFIRM]: { buttonText: 'Confirm', variant: ButtonVariant.danger } });
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

  const footer = (
    <Split hasGutter isWrappable>
      {...Object.entries(buttonOptions).map(([actionId, option]) => (
        <SplitItem key={actionId}>
          <Button
            key={actionId}
            variant={option.variant}
            onClick={() => handleAction(actionId)}
            data-testid={`action-confirmation-modal-btn-${actionId}`}
            isDanger={option.isDanger}
          >
            {option.buttonText}
          </Button>
        </SplitItem>
      ))}
      <SplitItem key="cancel">
        <Button
          key="cancel"
          variant="link"
          onClick={handleCloseModal}
          data-testid={`action-confirmation-modal-btn-${ACTION_ID_CANCEL}`}
        >
          Cancel
        </Button>
      </SplitItem>
    </Split>
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
          footer={footer}
        >
          {textParagraphs.length === 1
            ? textParagraphs[0]
            : textParagraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
        </Modal>
      )}
    </ActionConfirmationModalContext.Provider>
  );
};
