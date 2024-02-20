import { Button, InputGroup, InputGroupItem, Modal, TextInput } from '@patternfly/react-core';
import { PencilAltIcon } from '@patternfly/react-icons';
import { useState } from 'react';
import { ICamelLanguageDefinition } from '../../../models';
import { ExpressionEditor } from './ExpressionEditor';
import './ExpressionModalLauncher.scss';

export type ExpressionModalLauncherProps = {
  name: string;
  title?: string;
  language?: ICamelLanguageDefinition;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: any;
  description?: string;
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
  description,
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

  const expressionLabel = language && model?.expression ? language.model.name + ': ' + model.expression : '';

  return (
    <>
      <InputGroup>
        <InputGroupItem isFill>
          <TextInput
            id={'expression-preview-' + name}
            placeholder="Not configured"
            readOnlyVariant="default"
            value={expressionLabel}
          />
        </InputGroupItem>
        <InputGroupItem>
          <Button
            data-testid="launch-expression-modal-btn"
            variant="control"
            aria-label="Configure Expression"
            icon={<PencilAltIcon />}
            onClick={() => setIsModalOpen(true)}
          />
        </InputGroupItem>
      </InputGroup>
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
