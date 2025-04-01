import { BeanFactory } from '@kaoto/camel-catalog/types';
import { FunctionComponent, useCallback, useContext, useMemo, useState } from 'react';
import { BeansEntityHandler } from '../../../../../models/visualization/metadata/beans-entity-handler';
import { EntitiesContext } from '../../../../../providers';
import { getSerializedModel } from '../../../../../utils';
import { extractGroup } from '../../../../../utils/get-tagged-field-from-string';
import { NewBeanModal } from '../../../../Form';
import { CREATE_NEW_ITEM, Typeahead } from '../../../../typeahead/Typeahead';
import { TypeaheadItem } from '../../../../typeahead/Typeahead.types';
import { useFieldValue } from '../hooks/field-value';
import { SchemaContext } from '../providers/SchemaProvider';
import { FieldProps } from '../typings';
import { FieldWrapper } from './FieldWrapper';

export const BeanField: FunctionComponent<FieldProps> = ({ propName, required }) => {
  const { schema } = useContext(SchemaContext);
  const { value = '', onChange, disabled } = useFieldValue<string | undefined>(propName);
  const entitiesContext = useContext(EntitiesContext);
  const camelResource = entitiesContext?.camelResource;
  const beanReference = value;
  const beansHandler = useMemo(() => {
    return new BeansEntityHandler(camelResource);
  }, [camelResource]);
  const beanSchema = useMemo(() => {
    return beansHandler.getBeanSchema();
  }, [beansHandler]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string>(beanReference);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());

  const items = useMemo(() => {
    return (
      beansHandler.getAllBeansNameAndType().map((item) => ({
        name: item.name ? (beansHandler.getReferenceFromName(item.name) ?? '') : '',
        description: String(item.type),
        value: String(item.name),
      })) ?? []
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beansHandler, lastUpdated]);

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

  const onSelect = useCallback((value: string | undefined, filterValue: string | undefined) => {
    if (value) {
      if (value === CREATE_NEW_ITEM) {
        setInputValue(filterValue ?? '');
      } else {
        setInputValue('');
      }
      setIsOpen(true);
    }
  }, []);

  const handleCreateBean = useCallback(
    (model: BeanFactory) => {
      beansHandler.addNewBean(getSerializedModel(model as unknown as Record<string, unknown>));

      const beanRef = beansHandler.getReferenceFromName(model.name);

      setIsOpen(false);
      onChange(beanRef ?? '');
      setInputValue(beanRef as string);
      setLastUpdated(Date.now());
    },
    [beansHandler, onChange],
  );

  const handleCancelCreateBean = useCallback(() => {
    setInputValue(beanReference);
    setIsOpen(false);
  }, [beanReference]);

  const beanName = beansHandler.stripReferenceQuote(inputValue)
    ? beansHandler.stripReferenceQuote(inputValue)
    : undefined;
  const javaType = extractGroup('bean', schema.format);

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
          onCreatePrefix="bean"
          disabled={disabled}
        />
      </FieldWrapper>

      {isOpen && (
        <NewBeanModal
          beanSchema={beanSchema}
          beanName={beanName}
          propertyTitle={schema.title ?? ''}
          javaType={javaType}
          onCreateBean={handleCreateBean}
          onCancelCreateBean={handleCancelCreateBean}
        />
      )}
    </>
  );
};
