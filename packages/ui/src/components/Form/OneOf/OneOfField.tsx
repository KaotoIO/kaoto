import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { HTMLFieldProps, connectField } from 'uniforms';
import { useAppliedSchema, useSchemaBridgeContext } from '../../../hooks';
import { KaotoSchemaDefinition } from '../../../models';
import { SchemaBridgeProvider } from '../../../providers/schema-bridge.provider';
import { ROOT_PATH, isDefined } from '../../../utils';
import { OneOfSchemas, getOneOfSchemaList } from '../../../utils/get-oneof-schema-list';
import { CustomAutoForm, CustomAutoFormRef } from '../CustomAutoForm';
import { SchemaService } from '../schema.service';
import { OneOfSchemaList } from './OneOfSchemaList';

type OneOfComponentProps = HTMLFieldProps<
  object,
  HTMLDivElement,
  {
    properties?: Record<string, unknown>;
    helperText?: string;
    itemProps?: object;
    oneOf: KaotoSchemaDefinition['schema'][];
  }
>;

const applyDefinitionsToSchema = (
  schema?: KaotoSchemaDefinition['schema'],
  rootSchema?: KaotoSchemaDefinition['schema'],
) => {
  if (!isDefined(schema) || !isDefined(rootSchema)) {
    return schema;
  }

  return Object.assign({}, schema, {
    definitions: rootSchema.definitions,
  });
};

export const OneOfField = connectField(({ name: propsName, oneOf, onChange }: OneOfComponentProps) => {
  const formRef = useRef<CustomAutoFormRef>(null);
  const divRef = useRef<HTMLDivElement>(null);

  const { schemaBridge, parentRef } = useSchemaBridgeContext();
  const oneOfSchemas: OneOfSchemas[] = useMemo(
    () => getOneOfSchemaList(oneOf, schemaBridge?.schema),
    [oneOf, schemaBridge?.schema],
  );

  const appliedSchema = useAppliedSchema(propsName, oneOfSchemas);
  const [selectedSchema, setSelectedSchema] = useState<KaotoSchemaDefinition['schema'] | undefined>(
    applyDefinitionsToSchema(appliedSchema?.schema, schemaBridge?.schema),
  );
  const [selectedSchemaName, setSelectedSchemaName] = useState<string | undefined>(appliedSchema?.name);

  const onSchemaChanged = useCallback(
    (schemaName: string | undefined) => {
      if (schemaName === selectedSchemaName) return;
      /** Remove existing properties */
      const path = propsName === '' ? ROOT_PATH : `${propsName}.${selectedSchemaName}`;
      onChange(undefined, path);

      if (!isDefined(schemaName)) {
        setSelectedSchema(undefined);
        setSelectedSchemaName(undefined);
        return;
      }

      const selectedSchema = oneOfSchemas.find((schema) => schema.name === schemaName);
      const schemaWithDefinitions = applyDefinitionsToSchema(selectedSchema?.schema, schemaBridge?.schema);
      setSelectedSchema(schemaWithDefinitions);
      setSelectedSchemaName(schemaName);
    },
    [onChange, oneOfSchemas, propsName, schemaBridge?.schema, selectedSchemaName],
  );

  useEffect(() => {
    formRef.current?.form.reset();
  }, []);

  const handleOnChangeIndividualProp = useCallback(
    (path: string, value: unknown) => {
      const updatedPath = propsName === '' ? path : `${propsName}.${path}`;
      onChange(value, updatedPath);
    },
    [onChange, propsName],
  );

  return (
    <OneOfSchemaList
      name={propsName}
      oneOfSchemas={oneOfSchemas}
      selectedSchemaName={selectedSchemaName}
      onSchemaChanged={onSchemaChanged}
    >
      {isDefined(selectedSchema) && (
        <SchemaBridgeProvider schema={selectedSchema} parentRef={divRef}>
          {isDefined(parentRef?.current) &&
            createPortal(
              <>
                <CustomAutoForm
                  key={propsName}
                  ref={formRef}
                  model={appliedSchema?.model ?? {}}
                  onChange={handleOnChangeIndividualProp}
                  sortFields={false}
                  omitFields={SchemaService.OMIT_FORM_FIELDS}
                  data-testid={`${propsName}-autoform`}
                />
                <div data-testid={`${propsName}-form-placeholder`} ref={divRef} />
              </>,
              parentRef.current,
              propsName,
            )}
        </SchemaBridgeProvider>
      )}
    </OneOfSchemaList>
  );
});
