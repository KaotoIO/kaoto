import {
  Button,
  ButtonVariant,
  List,
  ListItem,
  Modal,
  ModalVariant,
  Popover,
  Title,
  TitleSizes,
} from '@patternfly/react-core';
import { FunctionComponent, useCallback, useEffect, useMemo, useState } from 'react';
import { XPathEditorLayout } from './XPathEditorLayout';
import { ExpressionItem } from '../../models/datamapper';
import './XPathEditorModal.scss';
import { ValidatedXPathParseResult, XPathService } from '../../services/xpath/xpath.service';
import { ExclamationCircleIcon } from '@patternfly/react-icons/dist/esm/icons/exclamation-circle-icon';

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
      <>
        <Title id="xpath-editor-modal" headingLevel="h1" size={TitleSizes['2xl']}>
          XPath Editor: {title}
          {validationResult && !validationResult.getCst() && (
            <Popover bodyContent={errorContent}>
              <Button
                data-testid="xpath-editor-error-btn"
                variant={ButtonVariant.link}
                isDanger
                icon={<ExclamationCircleIcon />}
              />
            </Popover>
          )}
        </Title>
      </>
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
