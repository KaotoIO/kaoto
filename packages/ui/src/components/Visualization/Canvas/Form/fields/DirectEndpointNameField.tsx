import { FieldProps, FieldWrapper, SchemaContext, Typeahead, useFieldValue } from '@kaoto/forms';
import { Button, InputGroup, InputGroupItem } from '@patternfly/react-core';
import { FunctionComponent, useContext, useEffect, useState } from 'react';

import { EntitiesContext } from '../../../../../providers/entities.provider';
import { VisibleFlowsContext } from '../../../../../providers/visible-flows.provider';
import { useCreateDirectRoute, useDirectEndpointNameOptions } from './DirectEndpointNameField.hooks';

export const DirectEndpointNameField: FunctionComponent<FieldProps> = ({ propName, required }) => {
  const { schema } = useContext(SchemaContext);
  const { value = '', onChange, disabled } = useFieldValue<string | undefined>(propName);
  const entitiesContext = useContext(EntitiesContext);
  const visibleFlowsContext = useContext(VisibleFlowsContext);
  const [typedInputValue, setTypedInputValue] = useState(value);

  useEffect(() => {
    setTypedInputValue(value);
  }, [value]);

  const { existingDirectRouteNames, items, selectedItem, typedName, onTypeaheadChange, onCleanInput } =
    useDirectEndpointNameOptions({
      value,
      onChange,
      visualEntities: entitiesContext?.visualEntities,
    });
  const typedCandidateName = typedInputValue.trim() || typedName;
  const { canCreateRoute, onCreateRoute } = useCreateDirectRoute({
    disabled: !!disabled,
    typedName: typedCandidateName,
    existingDirectRouteNames,
    onChange,
    entitiesContext,
    visibleFlowsContext,
  });

  return (
    <FieldWrapper
      propName={propName}
      required={required}
      title={schema.title}
      type="string"
      description={schema.description}
      defaultValue={schema.default?.toString()}
    >
      <InputGroup>
        <InputGroupItem isFill>
          <Typeahead
            aria-label={schema.title ?? propName}
            data-testid={propName}
            selectedItem={selectedItem}
            items={items}
            placeholder={schema.default?.toString()}
            id={propName}
            onChange={(item) => {
              onTypeaheadChange(item);
              setTypedInputValue(item?.name ?? '');
            }}
            onCleanInput={() => {
              onCleanInput();
              setTypedInputValue('');
            }}
            onInputValueChange={setTypedInputValue}
            disabled={disabled}
            allowCustomInput
          />
        </InputGroupItem>
        <InputGroupItem>
          <Button variant="secondary" onClick={onCreateRoute} isDisabled={!canCreateRoute}>
            Create Route
          </Button>
        </InputGroupItem>
      </InputGroup>
    </FieldWrapper>
  );
};
