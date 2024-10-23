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
import { XPathService } from '../../services/xpath/xpath.service';
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
  const [errors, setErrors] = useState<string[]>([]);

  const validateXPath = useCallback(() => {
    if (mapping.expression) {
      const validationErrors = XPathService.validate(mapping.expression);
      setErrors([...validationErrors.lexErrors, ...validationErrors.parseErrors]);
    }
  }, [mapping.expression]);

  useEffect(() => {
    validateXPath();
  }, [validateXPath]);

  const errorContent = useMemo(() => {
    return (
      <List>
        {errors.map((e) => (
          <ListItem key={e}>{e}</ListItem>
        ))}
      </List>
    );
  }, [errors]);

  const header = useMemo(
    () => (
      <>
        <Title id="xpath-editor-modal" headingLevel="h1" size={TitleSizes['2xl']}>
          XPath Editor: {title}
          {errors.length > 0 && (
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
    [errorContent, errors.length, title],
  );

  return (
    <Modal
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
