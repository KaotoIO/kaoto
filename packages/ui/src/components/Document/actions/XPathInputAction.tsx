import { ExpressionItem } from '../../../models/datamapper/mapping';
import { FormEvent, FunctionComponent, MouseEvent, useCallback, useEffect, useMemo, useState } from 'react';
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
import { ValidatedXPathParseResult, XPathService } from '../../../services/xpath/xpath.service';
import './XPathInputAction.scss';

type XPathInputProps = {
  mapping: ExpressionItem;
  onUpdate: () => void;
};
export const XPathInputAction: FunctionComponent<XPathInputProps> = ({ mapping, onUpdate }) => {
  const [validationResult, setValidationResult] = useState<ValidatedXPathParseResult>();

  const validateXPath = useCallback(() => {
    const result = XPathService.validate(mapping.expression);
    setValidationResult(result);
  }, [mapping.expression]);

  useEffect(() => {
    validateXPath();
  }, [validateXPath]);

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
        {validationResult?.getErrors().map((e) => <ListItem key={e}>{e}</ListItem>)}
        {validationResult?.getWarnings().map((w) => <ListItem key={w}>{w}</ListItem>)}
      </List>
    );
  }, [validationResult]);

  return (
    <ActionListItem key="xpath-input" className="input-group">
      <InputGroup>
        <InputGroupItem className="input-group__text">
          <TextInput
            data-testid="transformation-xpath-input"
            id="xpath"
            type="text"
            value={mapping.expression as string}
            onChange={handleXPathChange}
            onMouseMove={stopPropagation}
            onClick={stopPropagation}
          />
        </InputGroupItem>
        {validationResult &&
          (!validationResult.getCst() ||
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
