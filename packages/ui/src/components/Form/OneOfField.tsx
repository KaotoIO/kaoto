import { AutoField } from '@kaoto-next/uniforms-patternfly';
import {
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  MenuToggleElement,
  Text,
  TextContent,
  TextVariants,
} from '@patternfly/react-core';
import { FunctionComponent, Ref, useCallback, useMemo, useState } from 'react';
import { GuaranteedProps, connectField, useForm } from 'uniforms';
import { KaotoSchemaDefinition } from '../../models';
import { ROOT_PATH, getValue } from '../../utils';
import { CustomAutoFieldDetector } from './CustomAutoField';
import { SchemaBridge } from './schema-bridge';
import { SchemaService } from './schema.service';

interface OneOfComponentProps extends GuaranteedProps<unknown> {
  oneOf: KaotoSchemaDefinition['schema'][];
}

const OneOfComponent: FunctionComponent<OneOfComponentProps> = (props) => {
  const oneOfSchemas = useMemo(() => {
    return props.oneOf.map((oneOfSchema, index) => {
      const oneOfPropsKeys = Object.keys(oneOfSchema.properties ?? {});
      const name = oneOfPropsKeys.length === 1 ? oneOfPropsKeys[0] : index.toString();
      return { name, schema: oneOfSchema };
    });
  }, [props.oneOf]);

  const form = useForm();
  const currentModel = getValue(form.model, props.name === '' ? ROOT_PATH : props.name);
  const [appliedSchemaIndex, setAppliedSchemaIndex] = useState<number>(
    (form.schema as SchemaBridge).getAppliedSchemaIndex(currentModel, props.name),
  );

  const fields = useMemo(() => {
    if (appliedSchemaIndex === -1) return [];
    return Object.keys(oneOfSchemas[appliedSchemaIndex].schema.properties ?? []);
  }, [appliedSchemaIndex, oneOfSchemas]);

  const [selected, setSelected] = useState(appliedSchemaIndex === -1 ? '' : oneOfSchemas[appliedSchemaIndex].name);
  const [isOpen, setIsOpen] = useState(false);

  const onSelect = useCallback(
    (_event: unknown, value: string | number | undefined) => {
      setIsOpen(false);
      setSelected(value as string);

      /** Remove existing properties */
      fields.forEach((field) => {
        const path = props.name === '' ? field : `${props.name}.${field}`;
        props.onChange(undefined, path);
      });

      setAppliedSchemaIndex(oneOfSchemas.findIndex((schema) => schema.name === value));
    },
    [fields, oneOfSchemas, props],
  );

  const onToggleClick = useCallback(() => {
    setIsOpen(!isOpen);
  }, [isOpen]);

  const toggle = useCallback(
    (toggleRef: Ref<MenuToggleElement>) => (
      <MenuToggle ref={toggleRef} onClick={onToggleClick} isFullWidth isExpanded={isOpen}>
        {selected || (
          <TextContent>
            <Text component={TextVariants.small}>{SchemaService.DROPDOWN_PLACEHOLDER}</Text>
          </TextContent>
        )}
      </MenuToggle>
    ),
    [isOpen, onToggleClick, selected],
  );

  return (
    <>
      <Dropdown
        id={`${props.name}-oneof-select`}
        data-testid={`${props.name}-oneof-select`}
        isOpen={isOpen}
        selected={selected !== '' ? selected : undefined}
        onSelect={onSelect}
        onOpenChange={setIsOpen}
        toggle={toggle}
        isScrollable
      >
        <DropdownList data-testid={`${props.name}-oneof-select-dropdownlist`}>
          {oneOfSchemas.map((schemaDef) => {
            return (
              <DropdownItem
                data-testid={`${props.name}-oneof-select-dropdownlist-${schemaDef.name}`}
                key={schemaDef.name}
                value={schemaDef.name}
                description={schemaDef.name}
              >
                {schemaDef.name}
              </DropdownItem>
            );
          })}
        </DropdownList>
      </Dropdown>

      <AutoField.componentDetectorContext.Provider value={CustomAutoFieldDetector}>
        {fields.map((field) => (
          <AutoField key={props.name} disabled={props.disabled} name={field} />
        ))}
      </AutoField.componentDetectorContext.Provider>
    </>
  );
};

export const OneOfField = connectField(OneOfComponent as unknown as Parameters<typeof connectField>[0]);
