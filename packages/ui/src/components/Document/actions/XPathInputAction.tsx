import { ExpressionItem } from '../../../models/datamapper/mapping';
import { FormEvent, FunctionComponent, MouseEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionListItem,
  Button,
  ButtonVariant,
  InputGroup,
  InputGroupItem,
  List,
  ListItem,
  Popover,
  TextInput,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { XPathService } from '../../../services/xpath/xpath.service';

type XPathInputProps = {
  mapping: ExpressionItem;
  onUpdate: () => void;
};
export const XPathInputAction: FunctionComponent<XPathInputProps> = ({ mapping, onUpdate }) => {
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

  const handleXPathChange = useCallback(
    (event: FormEvent, value: string) => {
      if (mapping) {
        mapping.expression = value;
        onUpdate();
      }
      event.stopPropagation();
    },
    [mapping, onUpdate],
  );

  const stopPropagation = useCallback((event: MouseEvent) => {
    event.stopPropagation();
  }, []);

  const errorContent = useMemo(() => {
    return (
      <List>
        {errors.map((e) => (
          <ListItem key={e}>{e}</ListItem>
        ))}
      </List>
    );
  }, [errors]);

  return (
    <ActionListItem key="xpath-input">
      <InputGroup>
        <InputGroupItem>
          <TextInput
            data-testid="transformation-xpath-input"
            id="xpath"
            type="text"
            value={mapping.expression as string}
            onChange={handleXPathChange}
            onMouseMove={stopPropagation}
          />
        </InputGroupItem>
        {errors.length > 0 && (
          <InputGroupItem>
            <Popover bodyContent={errorContent}>
              <Button
                data-testid="xpath-input-error-btn"
                variant={ButtonVariant.link}
                isDanger
                icon={<ExclamationCircleIcon />}
              ></Button>
            </Popover>
          </InputGroupItem>
        )}
      </InputGroup>
    </ActionListItem>
  );
};
