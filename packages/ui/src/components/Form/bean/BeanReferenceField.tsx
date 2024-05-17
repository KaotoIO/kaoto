import { HTMLFieldProps, connectField } from 'uniforms';
import { EntitiesContext } from '../../../providers';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  MenuToggle,
  MenuToggleElement,
  Select,
  SelectList,
  SelectOption,
  SelectOptionProps,
  TextInputGroup,
  TextInputGroupMain,
  TextInputGroupUtilities,
} from '@patternfly/react-core';
import { TimesIcon } from '@patternfly/react-icons';
import { wrapField } from '@kaoto-next/uniforms-patternfly';
import { BeanFactory } from '@kaoto/camel-catalog/types';
import { NewBeanModal } from './NewBeanModal';
import { BeansEntityHandler } from '../../../models/visualization/metadata/beans-entity-handler';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BeanReferenceFieldProps = HTMLFieldProps<any, HTMLDivElement>;

const BeanReferenceFieldComponent = (props: BeanReferenceFieldProps) => {
  const createNewValue = 'kaoto-create-new';
  const createNewWithNameValue = 'kaoto-create-new-with-name';
  const entitiesContext = useContext(EntitiesContext);
  const camelResource = entitiesContext?.camelResource;
  const beanReference = (props.value as string) ?? '';
  const beansHandler = useMemo(() => {
    return new BeansEntityHandler(camelResource);
  }, [camelResource]);
  const beanSchema = useMemo(() => {
    return beansHandler.getBeanSchema();
  }, [beansHandler]);
  const beansEntity = useMemo(() => {
    return beansHandler.getBeansEntity();
  }, [beansHandler]);
  const allBeanOptions: SelectOptionProps[] = useMemo(() => {
    return beansHandler.getAllBeansNameAndType().map((bean) => {
      const beanRef = beansHandler.getReferenceFromName(bean.name);
      return {
        value: beanRef,
        children: bean.name,
        description: bean.type,
        isSelected: beanRef === beanReference,
      };
    });
  }, [beanReference, beansHandler]);

  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<string>('');
  const [inputValue, setInputValue] = useState<string>(beanReference);
  const [filterValue, setFilterValue] = useState<string>('');
  const [selectOptions, setSelectOptions] = useState<SelectOptionProps[]>(allBeanOptions);
  const [focusedItemIndex, setFocusedItemIndex] = useState<number | null>(null);
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const textInputRef = useRef<HTMLInputElement>();
  const [isNewBeanModalOpen, setIsNewBeanModalOpen] = useState<boolean>(false);

  useEffect(() => {
    let filteredOptions: SelectOptionProps[] = [...allBeanOptions];

    // Filter menu items based on the text input value when one exists
    if (filterValue) {
      let exactMatch = false;
      filteredOptions = allBeanOptions.filter((menuItem) => {
        if (menuItem.value === filterValue || menuItem.value === beansHandler.getReferenceFromName(filterValue)) {
          exactMatch = true;
        }
        return (
          String(menuItem.value).toLowerCase().includes(filterValue.toLowerCase()) ||
          String(menuItem.description).toLowerCase().includes(filterValue.toLowerCase())
        );
      });
      if (!exactMatch && !beansHandler.getReferenceQuote()?.includes(filterValue)) {
        filteredOptions.push({
          isDisabled: false,
          isSelected: false,
          children: `Create new bean "${filterValue}"`,
          value: createNewWithNameValue,
        });
      }

      // Open the menu when the input value changes and the new value is not empty
      if (!isOpen) {
        setIsOpen(true);
      }
    }
    if (!filteredOptions.find((op) => op.value === createNewWithNameValue)) {
      filteredOptions.push({
        isDisabled: false,
        isSelected: false,
        children: `Create new bean`,
        value: createNewValue,
      });
    }

    setSelectOptions(filteredOptions);
    setActiveItem(null);
    setFocusedItemIndex(null);
  }, [allBeanOptions, filterValue, isOpen]);

  const onToggleClick = useCallback(() => {
    setIsOpen(!isOpen);
  }, [isOpen]);

  const onSelect = useCallback(
    (_event: React.MouseEvent<Element, MouseEvent> | undefined, value: string | number | undefined) => {
      // eslint-disable-next-line no-console

      if (value) {
        if (value === createNewWithNameValue) {
          setIsNewBeanModalOpen(true);
        } else if (value === createNewValue) {
          setInputValue('');
          setIsNewBeanModalOpen(true);
        } else {
          // eslint-disable-next-line no-console
          setInputValue(value as string);
          setFilterValue('');
          setSelected(value as string);
          props.onChange(value);
        }
      }

      setIsOpen(false);
      setFocusedItemIndex(null);
      setActiveItem(null);
    },
    [props],
  );

  const onTextInputChange = useCallback(
    (_event: React.FormEvent<HTMLInputElement>, value: string) => {
      setInputValue(value);
      setFilterValue(value);
      props.onChange(value);
    },
    [props],
  );

  const onSelectOpenChange = useCallback((_isOpen: boolean) => {
    setIsOpen(false);
    setFilterValue('');
    setFocusedItemIndex(null);
    setActiveItem(null);
  }, []);

  const handleMenuArrowKeys = useCallback(
    (key: string) => {
      let indexToFocus = -1;

      if (isOpen) {
        if (key === 'ArrowUp') {
          // When no index is set or at the first index, focus to the last, otherwise decrement focus index
          if (focusedItemIndex === null || focusedItemIndex === 0) {
            indexToFocus = selectOptions.length - 1;
          } else {
            indexToFocus = focusedItemIndex - 1;
          }
        }

        if (key === 'ArrowDown') {
          // When no index is set or at the last index, focus to the first, otherwise increment focus index
          if (focusedItemIndex === null || focusedItemIndex === selectOptions.length - 1) {
            indexToFocus = 0;
          } else {
            indexToFocus = focusedItemIndex + 1;
          }
        }

        setFocusedItemIndex(indexToFocus);
        const focusedItem = selectOptions.filter((option) => !option.isDisabled)[indexToFocus];
        setActiveItem(`select-create-typeahead-${focusedItem.value.replace(' ', '-')}`);
      }
    },
    [focusedItemIndex, isOpen, selectOptions],
  );

  const onInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      const enabledMenuItems = selectOptions.filter((option) => !option.isDisabled);
      const [firstMenuItem] = enabledMenuItems;
      const focusedItem = focusedItemIndex ? enabledMenuItems[focusedItemIndex] : firstMenuItem;

      switch (event.key) {
        // Select the first available option
        case 'Enter':
          if (isOpen) {
            onSelect(undefined, focusedItem.value as string);
            setIsOpen((prevIsOpen) => !prevIsOpen);
            setFocusedItemIndex(null);
            setActiveItem(null);
          }

          setIsOpen((prevIsOpen) => !prevIsOpen);
          setFocusedItemIndex(null);
          setActiveItem(null);

          break;
        case 'Tab':
        case 'Escape':
          setIsOpen(false);
          setFilterValue('');
          setActiveItem(null);
          break;
        case 'ArrowUp':
        case 'ArrowDown':
          event.preventDefault();
          handleMenuArrowKeys(event.key);
          break;
      }
    },
    [focusedItemIndex, handleMenuArrowKeys, isOpen, onSelect, selectOptions],
  );

  const handleCreateBean = useCallback(
    (model: BeanFactory) => {
      beansHandler.addNewBean(model);

      const beanRef = beansHandler.getReferenceFromName(model.name);
      onSelect(undefined, beanRef);
      setIsNewBeanModalOpen(false);
    },
    [beansEntity, camelResource, onSelect],
  );

  const handleCancelCreateBean = useCallback(() => {
    setInputValue(beanReference);
    setIsNewBeanModalOpen(false);
  }, [beanReference]);

  const toggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle ref={toggleRef} variant="typeahead" onClick={onToggleClick} isExpanded={isOpen} isFullWidth>
      <TextInputGroup isPlain>
        <TextInputGroupMain
          value={inputValue}
          onClick={onToggleClick}
          onChange={onTextInputChange}
          onKeyDown={onInputKeyDown}
          id="create-typeahead-select-input"
          autoComplete="off"
          innerRef={textInputRef}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          placeholder={`${(props.field as any)?.title} bean reference`}
          {...(activeItem && { 'aria-activedescendant': activeItem })}
          role="combobox"
          isExpanded={isOpen}
          aria-controls="select-create-typeahead-listbox"
        />

        <TextInputGroupUtilities>
          {!!inputValue && (
            <Button
              data-testid={`${props.name}-clear-input-value-btn`}
              variant="plain"
              onClick={() => {
                setSelected('');
                setInputValue('');
                setFilterValue('');
                props.onChange('');
                textInputRef?.current?.focus();
              }}
              aria-label="Clear input value"
            >
              <TimesIcon aria-hidden />
            </Button>
          )}
        </TextInputGroupUtilities>
      </TextInputGroup>
    </MenuToggle>
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const javaType = (props.field as any)?.$comment?.startsWith('class:')
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (props.field as any)?.$comment?.replace('class:', '')
    : '';

  return wrapField(
    props,
    <>
      <Select
        id={`${props.name}-bean-select`}
        data-testid={`${props.name}-bean-select`}
        isOpen={isOpen}
        selected={selected}
        onSelect={onSelect}
        onOpenChange={onSelectOpenChange}
        toggle={toggle}
      >
        <SelectList id="select-create-typeahead-listbox">
          {selectOptions.map((option, index) => (
            <SelectOption
              key={option.children as string}
              description={option.description}
              isFocused={focusedItemIndex === index}
              className={option.className}
              onClick={() => setSelected(option.value)}
              id={`select-typeahead-${option.value.replace(' ', '-')}`}
              {...option}
              ref={null}
            />
          ))}
        </SelectList>
      </Select>
      <NewBeanModal
        isOpen={isNewBeanModalOpen}
        beanSchema={beanSchema!}
        beanName={beansHandler.stripReferenceQuote(inputValue)}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        propertyTitle={(props.field as any)?.title}
        javaType={javaType}
        onCreateBean={handleCreateBean}
        onCancelCreateBean={handleCancelCreateBean}
      />
    </>,
  );
};

export const BeanReferenceField = connectField(BeanReferenceFieldComponent);
