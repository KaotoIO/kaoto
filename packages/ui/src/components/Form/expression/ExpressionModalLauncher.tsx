import { Button, Modal, Split, SplitItem, TextInput } from '@patternfly/react-core';
import { PencilAltIcon } from '@patternfly/react-icons';
import { ExpressionEditor } from './ExpressionEditor';
import { useState } from 'react';
import { ICamelLanguageDefinition } from '../../../models';

export type ExpressionModalLauncherProps = {
  name: string;
  title?: string;
  language?: ICamelLanguageDefinition;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (languageName: string, model: any) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export const ExpressionModalLauncher = ({
  name,
  title,
  language,
  model,
  onChange,
  onConfirm,
  onCancel,
}: ExpressionModalLauncherProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOnConfirm = () => {
    setIsModalOpen(false);
    onConfirm();
  };

  const handleOnCancel = () => {
    setIsModalOpen(false);
    onCancel();
  };

  const description = title ? `Configure expression for "${title}" parameter` : 'Configure expression';
  const expressionLabel = language && model?.expression ? language.model.name + ': ' + model.expression : '';

  return (
    <>
      <Split>
        <SplitItem>
          <TextInput
            id={'expression-preview-' + name}
            placeholder="Not configured"
            readOnlyVariant="default"
            value={expressionLabel}
          ></TextInput>
        </SplitItem>
        <SplitItem>
          <Button
            data-testid="launch-expression-modal-btn"
            variant="link"
            aria-label="Configure Expression"
            icon={<PencilAltIcon />}
            onClick={() => setIsModalOpen(true)}
          ></Button>
        </SplitItem>
      </Split>
      <Modal
        isOpen={isModalOpen}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data-testid={`expression-modal`}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        title={title ? `${title}` : 'Expression'}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        description={description}
        onClose={handleOnCancel}
        actions={[
          <Button data-testid="confirm-expression-modal-btn" key="confirm" variant="primary" onClick={handleOnConfirm}>
            Apply
          </Button>,
          <Button data-testid="cancel-expression-modal-btn" key="cancel" variant="link" onClick={handleOnCancel}>
            Cancel
          </Button>,
        ]}
        ouiaId="ExpressionModal"
      >
        <ExpressionEditor
          expressionModel={model}
          language={language}
          onChangeExpressionModel={onChange}
        ></ExpressionEditor>
      </Modal>
    </>
  );
};
