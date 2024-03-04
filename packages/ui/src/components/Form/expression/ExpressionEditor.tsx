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
import { FunctionComponent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ICamelLanguageDefinition } from '../../../models';
import { MetadataEditor } from '../../MetadataEditor';
import { SchemaService } from '../schema.service';
import './ExpressionEditor.scss';
import { ExpressionService } from './expression.service';

interface ExpressionEditorProps {
  language?: ICamelLanguageDefinition;
  expressionModel: Record<string, unknown>;
  onChangeExpressionModel: (languageName: string, model: Record<string, unknown>) => void;
}

export const ExpressionEditor: FunctionComponent<ExpressionEditorProps> = ({
  language,
  expressionModel,
  onChangeExpressionModel,
}) => {
  const languageCatalogMap: SelectOptionProps[] = useMemo(() => {
    const languageCatalog = Object.values(ExpressionService.getLanguageMap());
    return languageCatalog!.map((option) => {
      return {
        value: option.model.name,
        children: option.model.title,
        className: option.model.name,
        description: option.model.description,
      };
    });
  }, []);

  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState<string>(language?.model.title || '');
  const [filterValue, setFilterValue] = useState<string>('');
  const [selectOptions, setSelectOptions] = useState<SelectOptionProps[]>(languageCatalogMap);
  const [focusedItemIndex, setFocusedItemIndex] = useState<number | null>(null);
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const textInputRef = useRef<HTMLInputElement>();
  const [selected, setSelected] = useState<string>(language?.model.title || '');

  const languageSchema = useMemo(() => {
    return language && ExpressionService.getLanguageSchema(language);
  }, [language]);

  const onSelect = useCallback(
    (_event: React.MouseEvent<Element, MouseEvent> | undefined, value: string | number | undefined) => {
      const model = languageCatalogMap.find((model) => model.children === value);
      if (model && value !== 'no results') {
        setInputValue(value as string);
        setFilterValue('');
        onChangeExpressionModel(model!.value as string, {});
        setSelected(model!.children as string);
      }
      setIsOpen(false);
      setFocusedItemIndex(null);
      setActiveItem(null);
    },
    [languageCatalogMap, onChangeExpressionModel],
  );

  const onToggleClick = useCallback(() => {
    setIsOpen(!isOpen);
  }, [isOpen]);

  useEffect(() => {
    let newSelectOptions: SelectOptionProps[] = languageCatalogMap;

    // Filter menu items based on the text input value when one exists
    if (filterValue) {
      newSelectOptions = languageCatalogMap.filter((menuItem) =>
        String(menuItem.value).toLowerCase().includes(filterValue.toLowerCase()),
      );
      // When no options are found after filtering, display 'No results found'
      if (!newSelectOptions.length) {
        newSelectOptions = [
          { isDisabled: false, children: `No results found for "${filterValue}"`, value: 'no results' },
        ];
      }
      // Open the menu when the input value changes and the new value is not empty
      if (!isOpen) {
        setIsOpen(true);
      }
    }

    setSelectOptions(newSelectOptions);
    setActiveItem(null);
    setFocusedItemIndex(null);
  }, [filterValue]);

  const onTextInputChange = (_event: React.FormEvent<HTMLInputElement>, value: string) => {
    setInputValue(value);
    setFilterValue(value);
  };

  const handleMenuArrowKeys = (key: string) => {
    let indexToFocus;

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

      setFocusedItemIndex(indexToFocus!);
      const focusedItem = selectOptions.filter((option) => !option.isDisabled)[indexToFocus!];
      setActiveItem(`select-typeahead-${focusedItem.value.replace(' ', '-')}`);
    }
  };

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const enabledMenuItems = selectOptions.filter((option) => !option.isDisabled);
    const [firstMenuItem] = enabledMenuItems;
    const focusedItem = focusedItemIndex ? enabledMenuItems[focusedItemIndex] : firstMenuItem;

    switch (event.key) {
      // Select the first available option
      case 'Enter':
        if (isOpen && focusedItem.value !== 'no results') {
          setInputValue(String(focusedItem.children));
          setFilterValue('');
          setSelected(String(focusedItem.children));
        }

        setIsOpen((prevIsOpen) => !prevIsOpen);
        setFocusedItemIndex(null);
        setActiveItem(null);
        break;
      case 'Tab':
      case 'Escape':
        setIsOpen(false);
        setActiveItem(null);
        break;
      case 'ArrowUp':
      case 'ArrowDown':
        event.preventDefault();
        handleMenuArrowKeys(event.key);
        break;
    }
  };

  const toggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle ref={toggleRef} variant="typeahead" onClick={onToggleClick} isExpanded={isOpen} isFullWidth>
      <TextInputGroup isPlain>
        <TextInputGroupMain
          data-testid="typeahead-select-input"
          value={inputValue}
          onClick={onToggleClick}
          onChange={onTextInputChange}
          onKeyDown={onInputKeyDown}
          id="typeahead-select-input"
          autoComplete="off"
          innerRef={textInputRef}
          placeholder={SchemaService.DROPDOWN_PLACEHOLDER}
          {...(activeItem && { 'aria-activedescendant': activeItem })}
          role="combobox"
          isExpanded={isOpen}
          aria-controls="select-typeahead-listbox"
        />

        <TextInputGroupUtilities>
          {!!inputValue && (
            <Button
              data-testid="clear-input-value"
              variant="plain"
              onClick={() => {
                setSelected('');
                setInputValue('');
                setFilterValue('');
                onChangeExpressionModel('', {});
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

  return (
    languageCatalogMap && (
      <>
        <Select
          id="typeahead-select"
          isOpen={isOpen}
          selected={selected}
          onSelect={onSelect}
          onOpenChange={() => {
            setIsOpen(false);
          }}
          toggle={toggle}
        >
          <SelectList id="select-typeahead-listbox">
            {selectOptions.map((option, index) => (
              <SelectOption
                key={option.value as string}
                description={option.description}
                isFocused={focusedItemIndex === index}
                className={option.className}
                data-testid={`expression-dropdownitem-${option.value}`}
                onClick={() => setSelected(option.children as string)}
                id={`select-typeahead-${option.value.replace(' ', '-')}`}
                {...option}
                value={option.children}
              />
            ))}
          </SelectList>
        </Select>
        {language && (
          <div className="metadata-editor">
            <MetadataEditor
              data-testid="expression-editor"
              name={'expression'}
              schema={languageSchema}
              metadata={expressionModel}
              onChangeModel={(model) => onChangeExpressionModel(language.model.name, model)}
            />
          </div>
        )}
      </>
    )
  );
};
