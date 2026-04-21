import './XPathInputAction.scss';

import {
  ActionListItem,
  Button,
  ButtonVariant,
  Icon,
  InputGroup,
  InputGroupItem,
  List,
  ListItem,
  Popover,
  TextInput,
} from '@patternfly/react-core';
import { ExclamationCircleIcon, ExclamationTriangleIcon } from '@patternfly/react-icons';
import { FormEvent, FunctionComponent, MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { IExpressionHolder } from '../../../models/datamapper/mapping';
import { TargetNodeData } from '../../../models/datamapper/visualization';
import { XPathService } from '../../../services/xpath/xpath.service';
import { ValidatedXPathParseResult } from '../../../services/xpath/xpath-model';
import { useDocumentTreeStore } from '../../../store/document-tree.store';

type XPathInputProps = {
  nodeData: TargetNodeData;
  mapping: IExpressionHolder;
  onUpdate: () => void;
};
export const XPathInputAction: FunctionComponent<XPathInputProps> = ({ nodeData, mapping, onUpdate }) => {
  const [validationResult, setValidationResult] = useState<ValidatedXPathParseResult>();
  const inputRef = useRef<HTMLInputElement>(null);
  const nodePathString = nodeData.path.toString();

  // Check if this mapping should receive focus from the store
  const shouldFocus = useDocumentTreeStore((state) => state.shouldFocusXPathInput(nodePathString));
  const clearFocusRequest = useDocumentTreeStore((state) => state.clearXPathInputFocusRequest);

  const validateXPath = useCallback(() => {
    const result = XPathService.validate(mapping.expression);
    setValidationResult(result);
  }, [mapping.expression]);

  useEffect(() => {
    validateXPath();
  }, [validateXPath]);

  // Focus input field when store indicates this mapping should be focused
  useEffect(() => {
    if (shouldFocus && inputRef.current) {
      inputRef.current.focus();
      clearFocusRequest();
    }
  }, [shouldFocus, clearFocusRequest]);

  const handleXPathChange = useCallback(
    (event: FormEvent, value: string) => {
      event.stopPropagation();
      if (mapping) {
        mapping.expression = value;
        onUpdate();
      }
    },
    [mapping, onUpdate],
  );

  const stopPropagation = useCallback((event: MouseEvent) => {
    event.stopPropagation();
  }, []);

  const errorContent = useMemo(() => {
    return (
      <List>
        {validationResult?.getErrors().map((e) => (
          <ListItem key={e}>{e}</ListItem>
        ))}
        {validationResult?.getWarnings().map((w) => (
          <ListItem key={w}>{w}</ListItem>
        ))}
      </List>
    );
  }, [validationResult]);

  return (
    <ActionListItem key="xpath-input" className="input-group">
      <InputGroup>
        <InputGroupItem className="input-group__text">
          <TextInput
            ref={inputRef}
            data-testid="transformation-xpath-input"
            id="xpath"
            type="text"
            value={mapping.expression}
            onChange={handleXPathChange}
            onMouseMove={stopPropagation}
            onClick={stopPropagation}
          />
        </InputGroupItem>
        {validationResult &&
          (!validationResult.getExprNode() ||
            validationResult.dataMapperErrors.length > 0 ||
            validationResult.hasWarnings()) && (
            <InputGroupItem>
              <Popover bodyContent={errorContent} triggerAction="hover" withFocusTrap={false}>
                <Button
                  data-testid="xpath-input-error-btn"
                  variant={ButtonVariant.link}
                  isDanger={validationResult.hasErrors()}
                  icon={
                    validationResult.hasErrors() ? (
                      <Icon status="danger">
                        <ExclamationCircleIcon />
                      </Icon>
                    ) : (
                      <Icon status="warning">
                        <ExclamationTriangleIcon />
                      </Icon>
                    )
                  }
                ></Button>
              </Popover>
            </InputGroupItem>
          )}
      </InputGroup>
    </ActionListItem>
  );
};
