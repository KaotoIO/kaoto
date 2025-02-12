import { BeanFactory } from '@kaoto/camel-catalog/types';
import { FunctionComponent, useCallback, useContext, useMemo, useState } from 'react';
import { BeansEntityHandler } from '../../../../../models/visualization/metadata/beans-entity-handler';
import { EntitiesContext } from '../../../../../providers';
import { getSerializedModel } from '../../../../../utils';
import { extractGroup } from '../../../../../utils/get-tagged-field-from-string';
import { NewBeanModal } from '../../../../Form';
import { Typeahead } from '../../../../typeahead/Typeahead';
import { TypeaheadItem } from '../../../../typeahead/Typeahead.types';
import { useFieldValue } from '../hooks/field-value';
import { SchemaContext } from '../providers/SchemaProvider';
import { FieldProps } from '../typings';
import { FieldWrapper } from './FieldWrapper';

export const BeanField: FunctionComponent<FieldProps> = ({ propName, required }) => {
  const { schema } = useContext(SchemaContext);
  const { value = '', onChange } = useFieldValue<string>(propName);
  const entitiesContext = useContext(EntitiesContext);
  const camelResource = entitiesContext?.camelResource;
  const beanReference = value;
  const beansHandler = useMemo(() => {
    return new BeansEntityHandler(camelResource);
  }, [camelResource]);
  const beanSchema = useMemo(() => {
    return beansHandler.getBeanSchema();
  }, [beansHandler]);
  const [isNewBeanModalOpen, setIsNewBeanModalOpen] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string>(beanReference);
  const beansEntity = useMemo(() => {
    return beansHandler.getBeansEntity();
  }, [beansHandler]);

  const items: TypeaheadItem<string | undefined>[] =
    beansEntity?.parent.beans.map((item) => ({
      name: item.name ? (beansHandler.getReferenceFromName(item.name) ?? '') : '',
      description: String(item.type),
      value: String(item.name),
    })) ?? [];

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
  }, [value]);

  const onItemChange = useCallback(
    (item?: TypeaheadItem<string>) => {
      onChange(item!.name);
    },
    [onChange],
  );

  const onCleanInput = useCallback(() => {
    onChange('');
  }, [onChange]);

  const createNewWithNameValue = 'create-new-with-name';

  const onSelect = useCallback((value: string | undefined, filterValue: string | undefined) => {
    if (value) {
      if (value === createNewWithNameValue) {
        setInputValue(filterValue ?? '');
      } else {
        setInputValue('');
      }
      setIsNewBeanModalOpen(true);
    }
  }, []);

  const handleCreateBean = useCallback(
    (model: BeanFactory) => {
      beansHandler.addNewBean(getSerializedModel(model as unknown as Record<string, unknown>));

      const beanRef = beansHandler.getReferenceFromName(model.name);

      setIsNewBeanModalOpen(false);
      onChange(beanRef ?? '');
      setInputValue(beanRef as string);
    },
    [beansEntity, camelResource, onChange, selectedItem, beansHandler],
  );

  const handleCancelCreateBean = useCallback(() => {
    setInputValue(beanReference);
    setIsNewBeanModalOpen(false);
  }, [beanReference]);
  const javaType = schema.format ? extractGroup('bean', schema.format) : '';

  if (!schema) {
    return <div>BeanField - Schema not defined</div>;
  }
  return (
    <FieldWrapper
      propName={propName}
      required={required}
      title={schema.title}
      type="string"
      description={schema.description}
      defaultValue={schema.default?.toString()}
    >
      <Typeahead
        selectedItem={selectedItem}
        items={items}
        placeholder={schema.default?.toString()}
        id={propName}
        onChange={onItemChange}
        onCleanInput={onCleanInput}
        onCreate={onSelect}
        onCreatePrefix="bean"
      />
      <NewBeanModal
        isOpen={isNewBeanModalOpen}
        beanSchema={beanSchema!}
        beanName={beansHandler.stripReferenceQuote(inputValue)}
        propertyTitle={schema.title ?? ''}
        javaType={javaType}
        onCreateBean={handleCreateBean}
        onCancelCreateBean={handleCancelCreateBean}
      />
    </FieldWrapper>
  );
};
