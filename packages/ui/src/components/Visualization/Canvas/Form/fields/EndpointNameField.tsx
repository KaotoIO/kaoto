import './EndpointNameField.scss';

import { Button } from '@carbon/react';
import { FieldProps, FieldWrapper, SchemaContext, Typeahead, useFieldValue } from '@kaoto/forms';
import { FunctionComponent, useContext, useState } from 'react';

import { EntitiesContext } from '../../../../../providers/entities.provider';
import { VisibleFlowsContext } from '../../../../../providers/visible-flows.provider';
import { useCreateRoute, useEndpointNameOptions } from './DirectEndpointNameField.hooks';

interface EndpointNameFieldProps extends FieldProps {
  /** Camel component scheme used to find existing routes and to create new ones */
  scheme: string;
}

export const EndpointNameField: FunctionComponent<EndpointNameFieldProps> = ({ propName, required, scheme }) => {
  const { schema } = useContext(SchemaContext);
  const { value = '', onChange, disabled } = useFieldValue<string | undefined>(propName);
  const entitiesContext = useContext(EntitiesContext);
  const visibleFlowsContext = useContext(VisibleFlowsContext);
  const [typedInputValue, setTypedInputValue] = useState(value);

  const [previousValue, setPreviousValue] = useState(value);
  if (previousValue !== value) {
    setPreviousValue(value);
    setTypedInputValue(value);
  }

  const { existingDirectRouteNames, items, selectedItem, typedName, onTypeaheadChange, onCleanInput } =
    useEndpointNameOptions({
      value,
      onChange,
      visualEntities: entitiesContext?.visualEntities,
      scheme,
    });
  const defaultValue = typeof schema.default === 'string' ? schema.default : undefined;
  const typedCandidateName = typedInputValue.trim() || typedName;
  const { canCreateRoute, onCreateRoute } = useCreateRoute({
    disabled: !!disabled,
    typedName: typedCandidateName,
    existingDirectRouteNames,
    onChange,
    entitiesContext,
    visibleFlowsContext,
    scheme,
  });

  return (
    <FieldWrapper
      propName={propName}
      required={required}
      title={schema.title}
      type="string"
      description={schema.description}
      defaultValue={defaultValue}
    >
      <div className="endpoint-name-field">
        <div className="endpoint-name-field__input">
          <Typeahead
            aria-label={schema.title ?? propName}
            data-testid={propName}
            selectedItem={selectedItem}
            items={items}
            placeholder={defaultValue}
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
        </div>
        <Button kind="secondary" size="md" onClick={onCreateRoute} disabled={!canCreateRoute}>
          Create Route
        </Button>
      </div>
    </FieldWrapper>
  );
};
