import { FieldProps, FieldWrapper, SchemaContext, Typeahead, TypeaheadItem, useFieldValue } from '@kaoto/forms';
import { FunctionComponent, useCallback, useContext, useMemo, useState } from 'react';

import { CitrusTestResource } from '../../../../../../models/citrus/citrus-test-resource';
import { EndpointsEntityHandler } from '../../../../../../models/visualization/metadata/citrus/endpoints-entity-handler';
import { EntitiesContext } from '../../../../../../providers';
import { EndpointModal } from './EndpointModal';

export const EndpointField: FunctionComponent<FieldProps> = ({ propName, required }) => {
  const { schema } = useContext(SchemaContext);
  const { value = '', onChange, disabled } = useFieldValue<string | undefined>(propName);
  const entitiesContext = useContext(EntitiesContext);
  const testResource = entitiesContext?.camelResource as CitrusTestResource | undefined;
  const endpointReference = value;
  const endpointsHandler = useMemo(() => new EndpointsEntityHandler(testResource), [testResource]);
  const endpointsSchema = useMemo(() => endpointsHandler.getEndpointsSchema(), [endpointsHandler]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());

  const items = useMemo(() => {
    return (
      endpointsHandler.getAllEndpointsNameAndType().map((item) => ({
        name: item.name,
        description: String(item.type),
        value: String(item.name),
      })) ?? []
    );

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpointsHandler, lastUpdated]);

  const selectedItem = useMemo(() => {
    if (!value) {
      return undefined;
    }
    // Object values are stringified. Double check later different approach.
    if (typeof value === 'object') {
      return {
        value: JSON.stringify(value),
        name: JSON.stringify(value),
        description: '',
      };
    }
    return items.find((item) => item.name === value) ?? { value: value, name: value, description: '' };
  }, [items, value]);

  const onItemChange = useCallback(
    (item?: TypeaheadItem<string>) => {
      onChange(item!.name);
    },
    [onChange],
  );

  const onCleanInput = useCallback(() => {
    onChange(undefined);
    setLastUpdated(Date.now());
    setIsOpen(false);
  }, [onChange]);

  const onSelect = useCallback((value: string | undefined, _filterValue: string | undefined) => {
    if (value) {
      setIsOpen(true);
    }
  }, []);

  const handleCreate = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (type: string, model: any) => {
      if (!type || model === undefined || typeof model !== 'object' || model?.name === undefined) {
        return;
      }

      endpointsHandler.addNewEndpoint(type, model as unknown as Record<string, unknown>);

      setIsOpen(false);
      onChange(model.name);
      setLastUpdated(Date.now());
    },
    [endpointsHandler, onChange],
  );

  const handleCancel = useCallback(() => {
    onChange(endpointReference);
    setIsOpen(false);
  }, [endpointReference, onChange]);

  return (
    <>
      <FieldWrapper
        propName={propName}
        required={required}
        title={schema.title}
        type="string"
        description={schema.description}
        defaultValue={schema.default?.toString()}
      >
        <Typeahead
          aria-label={schema.title ?? propName}
          data-testid={propName}
          selectedItem={selectedItem}
          items={items}
          placeholder={schema.default?.toString()}
          id={propName}
          onChange={onItemChange}
          onCleanInput={onCleanInput}
          onCreate={onSelect}
          disabled={disabled}
          allowCustomInput={true}
        />
      </FieldWrapper>

      {isOpen && (
        <EndpointModal
          mode={'Create'}
          endpointsSchema={endpointsSchema}
          onConfirm={handleCreate}
          onCancel={handleCancel}
        />
      )}
    </>
  );
};
