import {
  Button,
  Card,
  CardBody,
  CardExpandableContent,
  CardHeader,
  CardTitle,
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
import { FunctionComponent, Ref, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { EntitiesContext } from '../../../providers';
import { MetadataEditor } from '../../MetadataEditor';
import { CanvasNode } from '../../Visualization/Canvas/canvas.models';
import { LoadBalancerService } from './loadbalancer.service';
import { SchemaService } from '../schema.service';
import './LoadBalancerEditor.scss';
import { TimesIcon } from '@patternfly/react-icons';
interface LoadBalancerEditorProps {
  selectedNode: CanvasNode;
}

export const LoadBalancerEditor: FunctionComponent<LoadBalancerEditorProps> = (props) => {
  const entitiesContext = useContext(EntitiesContext);
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const loadBalancerCatalogMap = useMemo(() => {
    return LoadBalancerService.getLoadBalancerMap();
  }, []);

  const visualComponentSchema = props.selectedNode.data?.vizNode?.getComponentSchema();
  if (visualComponentSchema) {
    if (!visualComponentSchema.definition) {
      visualComponentSchema.definition = {};
    }
  }
  const { loadBalancer, model: loadBalancerModel } = LoadBalancerService.parseLoadBalancerModel(
    loadBalancerCatalogMap,
    visualComponentSchema?.definition,
  );
  const [selected, setSelected] = useState<string>(loadBalancer?.model.name || '');
  const [inputValue, setInputValue] = useState<string>(loadBalancer?.model.title || '');
  const initialLoadBalancerOptions = useMemo(() => {
    return Object.values(loadBalancerCatalogMap).map((option) => {
      return {
        value: option.model.name,
        children: option.model.title,
        description: option.model.description,
      };
    });
  }, [loadBalancerCatalogMap]);
  const [selectOptions, setSelectOptions] = useState<SelectOptionProps[]>(initialLoadBalancerOptions);
  const [focusedItemIndex, setFocusedItemIndex] = useState<number | null>(null);
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [filterValue, setFilterValue] = useState<string>('');
  const textInputRef = useRef<HTMLInputElement>();

  useEffect(() => {
    loadBalancer ? setSelected(loadBalancer.model.name) : setSelected('');
  }, [loadBalancer]);

  useEffect(() => {
    let newSelectOptions: SelectOptionProps[] = initialLoadBalancerOptions;

    // Filter menu items based on the text input value when one exists
    if (filterValue) {
      const lowerFilterValue = filterValue.toLowerCase();
      newSelectOptions = initialLoadBalancerOptions.filter((menuItem) => {
        return (
          String(menuItem.value).toLowerCase().includes(lowerFilterValue) ||
          String(menuItem.children).toLowerCase().includes(lowerFilterValue) ||
          String(menuItem.description).toLowerCase().includes(lowerFilterValue)
        );
      });
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
  }, [filterValue, initialLoadBalancerOptions, isOpen]);

  const loadBalancerSchema = useMemo(() => {
    return LoadBalancerService.getLoadBalancerSchema(loadBalancer);
  }, [loadBalancer]);

  const onToggleClick = useCallback(() => {
    setIsOpen(!isOpen);
  }, [isOpen]);

  const handleOnChange = useCallback(
    (selectedLoadBalancer: string, newLoadBalancerModel: Record<string, unknown>) => {
      const model = props.selectedNode.data?.vizNode?.getComponentSchema()?.definition;
      if (!model) return;
      LoadBalancerService.setLoadBalancerModel(
        loadBalancerCatalogMap,
        model,
        selectedLoadBalancer,
        newLoadBalancerModel,
      );
      props.selectedNode.data?.vizNode?.updateModel(model);
      entitiesContext?.updateSourceCodeFromEntities();
    },
    [entitiesContext, loadBalancerCatalogMap, props.selectedNode.data?.vizNode],
  );

  const onSelect = useCallback(
    (_event: React.MouseEvent<Element, MouseEvent> | undefined, value: string | number | undefined) => {
      const option = selectOptions.find((option) => option.children === value);
      if (option && value !== 'no results') {
        setInputValue(value as string);
        setFilterValue('');
        handleOnChange(option!.value as string, {});
        setSelected(option!.children as string);
      }
      setIsOpen(false);
      setFocusedItemIndex(null);
      setActiveItem(null);
    },
    [handleOnChange, selectOptions],
  );

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

  const toggle = (toggleRef: Ref<MenuToggleElement>) => (
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
                handleOnChange('', {});
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
    loadBalancerCatalogMap && (
      <Card isCompact={true} isExpanded={isExpanded}>
        <CardHeader onExpand={() => setIsExpanded(!isExpanded)}>
          <CardTitle>Load Balancer</CardTitle>
        </CardHeader>
        <CardExpandableContent>
          <CardBody data-testid={'loadbalancer-config-card'}>
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
                    data-testid={`loadbalancer-dropdownitem-${option.value}`}
                    onClick={() => setSelected(option.children as string)}
                    id={`select-typeahead-${option.value.replace(' ', '-')}`}
                    {...option}
                    value={option.children}
                  />
                ))}
              </SelectList>
            </Select>
            {loadBalancer && (
              <div className="load-balancer-editor">
                <MetadataEditor
                  key={loadBalancer.model.name}
                  data-testid="loadbalancer-editor"
                  name="loadbalancer"
                  schema={loadBalancerSchema}
                  metadata={loadBalancerModel}
                  onChangeModel={(model) => handleOnChange(loadBalancer.model.name, model)}
                />
              </div>
            )}
          </CardBody>
        </CardExpandableContent>
      </Card>
    )
  );
};
