import './XPathEditorModal.scss';

import {
  Button,
  ButtonVariant,
  List,
  ListItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Popover,
} from '@patternfly/react-core';
import { QuestionCircleIcon } from '@patternfly/react-icons';
import { ExclamationCircleIcon } from '@patternfly/react-icons/dist/esm/icons/exclamation-circle-icon';
import { FunctionComponent, useCallback, useEffect, useMemo, useState } from 'react';

import { ExpressionItem } from '../../models/datamapper';
import { XPathService } from '../../services/xpath/xpath.service';
import { ValidatedXPathParseResult } from '../../services/xpath/xpath-model';
import { XPathEditorLayout } from './XPathEditorLayout';

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
    return (
      <List>
        {validationResult?.getErrors().map((e) => (
          <ListItem key={e}>{e}</ListItem>
        ))}
      </List>
    );
  }, [validationResult]);

  const headerHelper = useMemo(
    () => (
      <section id="xpath-editor-modal" className="xpath-editor-modal__header">
        {validationResult && (!validationResult.getExprNode() || validationResult.dataMapperErrors.length > 0) && (
          <Popover bodyContent={errorContent}>
            <Button
              data-testid="xpath-editor-error-btn"
              variant={ButtonVariant.link}
              isDanger
              icon={<ExclamationCircleIcon />}
            />
          </Popover>
        )}

        <Popover
          bodyContent={
            <p>
              Grab a field from the left panel and drag it into the editor on the right to create mappings. To apply
              functions, open the Functions tab on the left and drag them into the right panel as well. You can also
              type directly in the right-side editor to create mappings manually.
            </p>
          }
        >
          <Button data-testid="xpath-editor-hint" variant={ButtonVariant.link} icon={<QuestionCircleIcon />} />
        </Popover>
      </section>
    ),
    [errorContent, validationResult],
  );

  return (
    <Modal
      aria-label="XPath Editor Modal"
      className="xpath-editor-modal"
      position="top"
      variant={ModalVariant.large}
      width="90%"
      isOpen={isOpen}
      onClose={onClose}
      data-testid="xpath-editor-modal"
    >
      <ModalHeader title={<h1 className="pf-v6-c-title pf-m-3xl">XPath Editor: {title}</h1>} help={headerHelper} />
      <ModalBody>
        <XPathEditorLayout mapping={mapping} onUpdate={onUpdate} />
      </ModalBody>
      <ModalFooter>
        <Button key="close-xpath-editor" onClick={onClose} data-testid="close-xpath-editor-btn">
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
};
