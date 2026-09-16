import { BeanFactory } from '@kaoto/camel-catalog/types';
import {
  CREATE_NEW_ITEM,
  extractGroup,
  FieldProps,
  FieldWrapper,
  SchemaContext,
  Typeahead,
  TypeaheadItem,
  useFieldValue,
} from '@kaoto/forms';
import { FunctionComponent, Suspense, use, useCallback, useContext, useMemo, useState } from 'react';

import { KaotoSchemaDefinition } from '../../../../../../models/kaoto-schema';
import { BeansEntityHandler } from '../../../../../../models/visualization/metadata/beans-entity-handler';
import { EntitiesContext } from '../../../../../../providers';
import { getSerializedModel } from '../../../../../../utils';
import { Loading } from '../../../../../Loading';
import { NewBeanModal, NewBeanModalProps } from './NewBeanModal';

const DEFAULT_DATASOURCE_NAMES = [
  { name: 'default', value: 'default' },
  { name: 'dataSource', value: 'dataSource' },
];

const dataSourceFilterFn = (item: { name: string; type: string }) => {
  return item.type.includes('DataSource');
};

export const PrefixedBeanField: FunctionComponent<FieldProps> = ({ propName, required }) => (
  <BeanFieldBase propName={propName} required={required} shouldPrefixBeanName />
);

export const UnprefixedBeanField: FunctionComponent<FieldProps> = ({ propName, required }) => (
  <BeanFieldBase propName={propName} required={required} shouldPrefixBeanName={false} />
);

export const DataSourceBeanField: FunctionComponent<FieldProps> = ({ propName, required }) => (
  <BeanFieldBase
    propName={propName}
    required={required}
    shouldPrefixBeanName={false}
    defaultItems={DEFAULT_DATASOURCE_NAMES}
    filterFn={dataSourceFilterFn}
  />
);

interface BeanFieldProps extends FieldProps {
  shouldPrefixBeanName: boolean;
  filterFn?: (item: { name: string; type: string }) => boolean;
  defaultItems?: TypeaheadItem<string>[];
}

const BeanFieldBase: FunctionComponent<BeanFieldProps> = ({
  propName,
  required,
  shouldPrefixBeanName,
  filterFn,
  defaultItems = [],
}) => {
  const entitiesContext = useContext(EntitiesContext);
  const camelResource = entitiesContext?.camelResource;
  const beansHandler = useMemo(() => new BeansEntityHandler(camelResource), [camelResource]);
  const [beanSchemaPromise, setBeanSchemaPromise] = useState<
    Promise<KaotoSchemaDefinition['schema'] | undefined> | undefined
  >(undefined);
  const { schema } = useContext(SchemaContext);
  const { value = '', onChange, disabled } = useFieldValue<string | undefined>(propName);
  const beanReference = value;
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string>(beanReference);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());

  const items = useMemo(() => {
    const beanItems =
      beansHandler
        .getAllBeansNameAndType()
        .filter((item) => filterFn?.(item) ?? true)
        .map((item) => ({
          name: shouldPrefixBeanName ? beansHandler.getReferenceFromName(item.name) : item.name,
          description: String(item.type),
          value: String(item.name),
        })) ?? [];

    return defaultItems.concat(beanItems);

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

  const onSelect = useCallback(
    (value: string | undefined, filterValue: string | undefined) => {
      if (value) {
        if (value === CREATE_NEW_ITEM) {
          setInputValue(filterValue ?? '');
        } else {
          setInputValue('');
        }
        // Only creating a bean needs its catalog schema. Source refreshes must
        // update the existing endpoint fields without suspending their rendering.
        setBeanSchemaPromise(beansHandler.getBeanSchema());
        setIsOpen(true);
      }
    },
    [beansHandler],
  );

  const handleCreateBean = useCallback(
    (model: BeanFactory) => {
      beansHandler.addNewBean(
        getSerializedModel(model as unknown as Record<string, unknown>) as unknown as BeanFactory,
      );

      let beanRef = model.name;
      if (shouldPrefixBeanName) {
        beanRef = beansHandler.getReferenceFromName(model.name);
      }

      setIsOpen(false);
      onChange(beanRef);
      setInputValue(beanRef);
      setLastUpdated(Date.now());
    },
    [beansHandler, onChange, shouldPrefixBeanName],
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

      {isOpen && beanSchemaPromise && (
        <Suspense fallback={<Loading />}>
          <NewBeanModalWithSchema
            beanSchemaPromise={beanSchemaPromise}
            beanName={beanName}
            propertyTitle={schema.title ?? ''}
            javaType={javaType}
            onCreateBean={handleCreateBean}
            onCancelCreateBean={handleCancelCreateBean}
          />
        </Suspense>
      )}
    </>
  );
};

const NewBeanModalWithSchema: FunctionComponent<
  Omit<NewBeanModalProps, 'beanSchema'> & {
    beanSchemaPromise: Promise<KaotoSchemaDefinition['schema'] | undefined>;
  }
> = ({ beanSchemaPromise, ...props }) => {
  const beanSchema = use(beanSchemaPromise);
  return <NewBeanModal {...props} beanSchema={beanSchema} />;
};
