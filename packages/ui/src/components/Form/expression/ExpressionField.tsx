import { connectField, HTMLFieldProps } from 'uniforms';
import { Button, Modal } from '@patternfly/react-core';
import { wrapField } from '@kaoto-next/uniforms-patternfly';
import { PencilAltIcon } from '@patternfly/react-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ExpressionEditor } from './ExpressionEditor';
import { ExpressionService } from './expression.service';
import { ICamelLanguageDefinition } from '../../../models';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ExpressionFieldProps = HTMLFieldProps<any, HTMLDivElement>;

const ExpressionFieldComponent = (props: ExpressionFieldProps) => {
  const languageCatalogMap = useMemo(() => {
    return ExpressionService.getLanguageMap();
  }, []);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [preparedLanguage, setPreparedLanguage] = useState<ICamelLanguageDefinition>();
  const [preparedModel, setPreparedModel] = useState<Record<string, unknown>>({});

  useEffect(() => {
    const { language, model: expressionModel } = ExpressionService.parsePropertyExpressionModel(
      languageCatalogMap,
      props.value,
    );
    setPreparedLanguage(language);
    setPreparedModel(expressionModel);
  }, [languageCatalogMap, props.value, modalIsOpen]);

  const onChange = useCallback(
    (languageName: string, model: Record<string, unknown>) => {
      const language = ExpressionService.getDefinitionFromModelName(languageCatalogMap, languageName);
      setPreparedLanguage(language);
      setPreparedModel(model);
    },
    [languageCatalogMap],
  );

  const handleConfirm = useCallback(() => {
    if (preparedLanguage && preparedModel) {
      ExpressionService.setPropertyExpressionModel(
        languageCatalogMap,
        props.value,
        preparedLanguage?.model.name,
        preparedModel,
      );
      props.onChange(props.value);
    }
    setModalIsOpen(false);
  }, [languageCatalogMap, preparedLanguage, preparedModel, props]);

  const handleCancel = useCallback(() => {
    setModalIsOpen(false);
  }, []);

  return wrapField(
    props,
    <>
      <Button
        variant="link"
        aria-label="Configure Expression"
        icon={<PencilAltIcon />}
        onClick={() => setModalIsOpen(true)}
      >
        Configure Expression
      </Button>
      <Modal
        isOpen={modalIsOpen}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data-testid={`ExpressionModal-${(props.field as any).name}`}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        title={`${(props.field as any).title}`}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        description={`Configure "${(props.field as any).title}" expression`}
        onClose={handleCancel}
        actions={[
          <Button key="confirm" variant="primary" onClick={handleConfirm}>
            Apply
          </Button>,
          <Button key="cancel" variant="link" onClick={handleCancel}>
            Cancel
          </Button>,
        ]}
        ouiaId="ExpressionModal"
      >
        <ExpressionEditor
          expressionModel={preparedModel}
          language={preparedLanguage}
          onChangeExpressionModel={onChange}
        ></ExpressionEditor>
      </Modal>
    </>,
  );
};
export const ExpressionField = connectField(ExpressionFieldComponent);
