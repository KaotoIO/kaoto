import {
  Button,
  ButtonVariant,
  List,
  ListItem,
  Modal,
  ModalVariant,
  Popover,
} from '@patternfly/react-core';
import { FunctionComponent, useCallback, useEffect, useMemo, useState } from 'react';
import { XPathEditorLayout } from './XPathEditorLayout';
import { ExpressionItem } from '../../models/datamapper';
import './XPathEditorModal.scss';
import { ValidatedXPathParseResult, XPathService } from '../../services/xpath/xpath.service';
import { ExclamationCircleIcon } from '@patternfly/react-icons/dist/esm/icons/exclamation-circle-icon';
import { QuestionCircleIcon } from '@patternfly/react-icons';

type XPathEditorModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  mapping: ExpressionItem;
  onUpdate: () => void;
};

export const XPathEditorModal: FunctionComponent<XPathEditorModalProps> = ({
  isOpen,
  onClose,
  title,
  mapping,
  onUpdate,
}) => {
  const [validationResult, setValidationResult] = useState<ValidatedXPathParseResult>();

  const validateXPath = useCallback(() => {
    if (mapping.expression) {
      const validationResult = XPathService.validate(mapping.expression);
      setValidationResult(validationResult);
    } else {
      setValidationResult(undefined);
    }
  }, [mapping.expression]);

  useEffect(() => {
    validateXPath();
  }, [validateXPath]);

  const errorContent = useMemo(() => {
    return <List>{validationResult?.getErrors().map((e) => <ListItem key={e}>{e}</ListItem>)}</List>;
  }, [validationResult]);

  const header = useMemo(
    () => (
      <section id="xpath-editor-modal" className="xpath-editor-modal__header">
        <h1 className="pf-v5-c-title pf-m-3xl">XPath Editor: {title}</h1>

        <Popover bodyContent={<p>Grab a field or a function from the left panel and drag it to the right panel</p>}>
          <Button data-testid="xpath-editor-hint" variant={ButtonVariant.link} icon={<QuestionCircleIcon />} />
        </Popover>

        {validationResult && (!validationResult.getCst() || validationResult.dataMapperErrors.length > 0) && (
          <Popover bodyContent={errorContent}>
            <Button
              data-testid="xpath-editor-error-btn"
              variant={ButtonVariant.link}
              isDanger
              icon={<ExclamationCircleIcon />}
            />
          </Popover>
        )}
      </section>
    ),
    [errorContent, title, validationResult],
  );

  return (
    <Modal
      aria-label="XPath Editor Modal"
      className="xpath-editor-modal"
      position="top"
      header={header}
      variant={ModalVariant.large}
      width="90%"
      isOpen={isOpen}
      onClose={onClose}
      data-testid="xpath-editor-modal"
      actions={[
        <Button key="close-xpath-editor" onClick={onClose} data-testid="close-xpath-editor-btn">
          Close
        </Button>,
      ]}
    >
      <XPathEditorLayout mapping={mapping} onUpdate={onUpdate} />
    </Modal>
  );
};
