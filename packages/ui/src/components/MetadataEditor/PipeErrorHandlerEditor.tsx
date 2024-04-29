import { FunctionComponent, PropsWithChildren, Ref, useCallback, useEffect, useMemo, useState } from 'react';
import { PipeErrorHandler as PipeErrorHandlerType } from '@kaoto/camel-catalog/types';
import { MenuToggle, MenuToggleElement, Select, SelectList, SelectOption } from '@patternfly/react-core';
import { MetadataEditor } from './MetadataEditor';

interface PipeErrorHandlerEditorProps {
  schema: unknown;
  model: unknown;
  onChangeModel: (model: PipeErrorHandlerType) => void;
}

export const PipeErrorHandlerEditor: FunctionComponent<PropsWithChildren<PipeErrorHandlerEditorProps>> = (props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [errorHandlerType, setErrorHandlerType] = useState<string>('none');
  const schema = props.schema as Record<string, unknown>;
  const schemaOneOf = schema.oneOf as Record<string, unknown>[];

  useEffect(() => {
    const modelRecord = props.model as Record<string, unknown>;
    Object.keys(modelRecord).length > 0 && setErrorHandlerType(Object.keys(modelRecord)[0]);
  }, [props.model]);

  const onToggleClick = useCallback(() => {
    setIsOpen(!isOpen);
  }, [isOpen]);

  const onSelect = useCallback(
    (_event: React.MouseEvent<Element, MouseEvent> | undefined, value: string | number | undefined) => {
      setErrorHandlerType(value as string);
      setIsOpen(false);
      if (value === 'none') {
        props.onChangeModel({} as PipeErrorHandlerType);
      } else {
        const updatedModel: Record<string, unknown> = {};
        updatedModel[value as string] = {};
        props.onChangeModel(updatedModel as PipeErrorHandlerType);
      }
    },
    [props],
  );

  const toggle = useCallback(
    (toggleRef: Ref<MenuToggleElement>) => (
      <MenuToggle ref={toggleRef} onClick={onToggleClick} isExpanded={isOpen}>
        {errorHandlerType}
      </MenuToggle>
    ),
    [errorHandlerType, isOpen, onToggleClick],
  );

  const selectedSchema = useMemo(() => {
    return schemaOneOf.find((entry) => {
      return (entry.required as string[])[0] === errorHandlerType;
    });
  }, [schemaOneOf, errorHandlerType]);

  return (
    <>
      <Select
        id={'pipe-error-handler-select'}
        data-testid={'pipe-error-handler-select'}
        isOpen={isOpen}
        selected={errorHandlerType}
        onSelect={onSelect}
        toggle={toggle}
      >
        <SelectList data-testid={'pipe-error-handler-select-list'}>
          {schemaOneOf.map((entry) => {
            const key = (entry.required as string[])[0];
            const title = entry.title as string;
            return (
              <SelectOption data-testid={'pipe-error-handler-select-option-' + key} key={title} value={key}>
                {title}
              </SelectOption>
            );
          })}
        </SelectList>
      </Select>
      {errorHandlerType != 'none' && selectedSchema && (
        <MetadataEditor
          name={selectedSchema?.title as string}
          schema={selectedSchema}
          metadata={props.model}
          onChangeModel={props.onChangeModel}
        />
      )}
    </>
  );
};
