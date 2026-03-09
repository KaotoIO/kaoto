import { To } from '@kaoto/camel-catalog/types';
import { FieldProps, ModelContextProvider, SchemaProvider, useFieldValue } from '@kaoto/forms';
import { FunctionComponent, use, useCallback, useMemo, useState } from 'react';

import { DirectEndpointNameField } from '../../../components/Visualization/Canvas/Form/fields/DirectEndpointNameField';
import { toParser } from '../../../models/camel/parsers/to.parser';
import { KaotoSchemaDefinition } from '../../../models/kaoto-schema';

const NAME_FIELD_SCHEMA: KaotoSchemaDefinition['schema'] = {
  title: 'Endpoint Name',
  type: 'string',
};

/**
 * RestRouteEndpointField
 *
 * Override field for the Rest methods To property. f.i.:
 * - rest:
 *     get:
 *       - path: /route-66
 *         to: {}                 # <- This field
 *
 * The goal is to abstract the user from all parameters from the `to` property since we're
 * only interested on the route URI to which this path connects to.
 */
export const RestRouteEndpointField: FunctionComponent<FieldProps> = ({
  propName,
  required,
  'aria-label': ariaLabel,
  'data-testid': dataTestId,
  onRemove,
}) => {
  const { value, disabled, onChange } = useFieldValue<To | undefined>(propName);
  const toPromise = useMemo(() => toParser(value), [value]);
  const parsedTo = use(toPromise);
  const [typedInputValue, setTypedInputValue] = useState((parsedTo.parameters.name as string) ?? '');

  const onPropertyChangeCallback = useCallback(
    (_: string, name: unknown) => {
      const updatedTo = { ...parsedTo, parameters: { ...parsedTo.parameters, name } };

      onChange(updatedTo);
      setTypedInputValue(name as string);
    },
    [onChange, parsedTo],
  );

  return (
    <SchemaProvider schema={NAME_FIELD_SCHEMA}>
      <ModelContextProvider onPropertyChange={onPropertyChangeCallback} model={typedInputValue} disabled={disabled}>
        <DirectEndpointNameField
          propName="#"
          required={required}
          aria-label={ariaLabel}
          data-testid={dataTestId}
          onRemove={onRemove}
        />
      </ModelContextProvider>
    </SchemaProvider>
  );
};
