import { To } from '@kaoto/camel-catalog/types';
import { FieldProps, ModelContextProvider, SchemaProvider, useFieldValue } from '@kaoto/forms';
import { FunctionComponent, useCallback, useEffect, useState } from 'react';

import { Loading } from '../../../components/Loading';
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
  const [resolved, setResolved] = useState<{ value: To | undefined; parsedTo: Awaited<ReturnType<typeof toParser>> }>();
  const isParsing = !resolved || resolved.value !== value;
  useEffect(() => {
    let cancelled = false;
    toParser(value)
      .then((parsedTo) => {
        if (!cancelled) setResolved({ value, parsedTo });
      })
      .catch((error) => {
        if (!cancelled) console.error('Failed to parse REST endpoint:', error);
      });
    return () => {
      cancelled = true;
    };
  }, [value]);

  const onPropertyChangeCallback = useCallback(
    (_: string, name: unknown) => {
      if (isParsing || !resolved) return;
      const { parsedTo } = resolved;
      const updatedTo = { ...parsedTo, parameters: { ...parsedTo.parameters, name } };

      onChange(updatedTo);
      setResolved({ value, parsedTo: updatedTo });
    },
    [isParsing, onChange, resolved, value],
  );

  if (!resolved) return <Loading />;

  return (
    <div inert={isParsing || undefined}>
      <SchemaProvider schema={NAME_FIELD_SCHEMA}>
        <ModelContextProvider
          onPropertyChange={onPropertyChangeCallback}
          model={(resolved.parsedTo.parameters.name as string) ?? ''}
          disabled={disabled}
        >
          <DirectEndpointNameField
            propName="#"
            required={required}
            aria-label={ariaLabel}
            data-testid={dataTestId}
            onRemove={onRemove}
          />
        </ModelContextProvider>
      </SchemaProvider>
    </div>
  );
};
