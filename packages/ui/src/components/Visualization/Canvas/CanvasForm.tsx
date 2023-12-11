import { AutoFields, AutoForm, ErrorsField } from '@kaoto-next/uniforms-patternfly';
import { Title } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { ErrorBoundary } from '../../ErrorBoundary';
import { SchemaService } from '../../Form';
import { CustomAutoField } from '../../Form/CustomAutoField';
import { CanvasNode } from './canvas.models';
import { EntitiesContext } from '../../../providers/entities.provider';
import { ExpressionEditor } from './ExpressionEditor';
import { DataFormatEditor } from './DataFormatEditor';
import type { JSONSchemaType } from 'ajv';

interface CanvasFormProps {
  selectedNode: CanvasNode;
}

export function getNonDefaultProperties(
  obj1: JSONSchemaType<unknown>,
  obj2: Record<string, unknown>,
): Record<string, unknown> {
  const modelResult = Object.entries(obj2.parameters as object).reduce(
    (acc: [string, unknown][], currentValue: [string, unknown]) => {
      if (typeof currentValue[1] === 'object' && Array.isArray(currentValue[1])) {
        const filteredArray = currentValue[1].filter((item) => item !== undefined && item.length !== 0);
        if (obj1[currentValue[0]]['default'] !== undefined) {
          if (!(obj1[currentValue[0]]['default'].toString() === filteredArray.toString())) {
            acc.push([currentValue[0], filteredArray]);
          }
        } else {
          if (filteredArray.length > 0) {
            acc.push([currentValue[0], filteredArray]);
          }
        }
      } else {
        if (!(obj1[currentValue[0]]['default'] == currentValue[1])) {
          acc.push(currentValue);
        }
      }
      return acc;
    },
    [],
  );
  return { ...obj2, parameters: Object.fromEntries(modelResult) };
}

export function getNonEmptyProperties(obj: Record<string, unknown>): Record<string, unknown> {
  const result = Object.entries(obj.parameters as object).reduce(
    (acc: [string, unknown][], currentValue: [string, unknown]) => {
      switch (typeof currentValue[1]) {
        case 'string':
          if (currentValue[1].trim().length !== 0) {
            acc.push(currentValue);
          }
          break;
        case 'object':
          if (Object.keys(currentValue[1] as object).length !== 0) {
            acc.push(currentValue);
          }
          break;
        default:
          acc.push(currentValue);
      }
      return acc;
    },
    [],
  );
  return { ...obj, parameters: Object.fromEntries(result) };
}

const omitFields = ['expression', 'dataFormatType', 'outputs', 'steps', 'when', 'otherwise', 'doCatch', 'doFinally'];

export const CanvasForm: FunctionComponent<CanvasFormProps> = (props) => {
  const entitiesContext = useContext(EntitiesContext);
  const formRef = useRef<typeof AutoForm>();
  const schemaServiceRef = useRef(new SchemaService());

  const visualComponentSchema = useMemo(() => {
    const answer = props.selectedNode.data?.vizNode?.getComponentSchema();
    // Overriding parameters with an empty object When the parameters property is mistakenly set to null
    if (answer?.definition?.parameters === null) {
      answer!.definition.parameters = {};
    }
    return answer;
  }, [props.selectedNode.data?.vizNode]);
  const schema = useMemo(() => {
    return schemaServiceRef.current.getSchemaBridge(visualComponentSchema?.schema);
  }, [visualComponentSchema?.schema]);
  const model = visualComponentSchema?.definition;
  const componentName = visualComponentSchema?.title;

  useEffect(() => {
    formRef.current?.reset();
  }, [props.selectedNode.data?.vizNode]);

  const handleOnChange = useCallback(
    (newModel: Record<string, unknown>) => {
      if (newModel.parameters !== undefined && Object.keys(newModel.parameters as object).length !== 0) {
        // newModelNonDefault will contain only those properties that has different value than default.
        const newModelNonDefault = getNonDefaultProperties(
          props.selectedNode.data?.vizNode?.getComponentSchema()?.schema?.properties.parameters.properties,
          newModel,
        );
        // newModelClean will contain only non empty propertis that has different value than default.
        const newModelClean = getNonEmptyProperties(newModelNonDefault);
        props.selectedNode.data?.vizNode?.updateModel(newModelClean);
      } else {
        props.selectedNode.data?.vizNode?.updateModel(newModel);
      }
      entitiesContext?.updateSourceCodeFromEntities();
    },
    [entitiesContext, props.selectedNode.data?.vizNode, props.selectedNode.id],
  );

  const isExpressionAwareStep = useMemo(() => {
    return schema?.schema && schema.schema['$comment']?.includes('expression');
  }, [schema]);

  const isDataFormatAwareStep = useMemo(() => {
    return schema?.schema && schema.schema['$comment']?.includes('dataformat');
  }, [schema]);

  const isLoadBalanceAwareStep = useMemo(() => {
    return schema?.schema && schema.schema['$comment']?.includes('loadbalance');
  }, [schema]);

  return schema?.schema === undefined ? null : (
    <ErrorBoundary key={props.selectedNode.id} fallback={<p>This node cannot be configured yet</p>}>
      <Title headingLevel="h1">{componentName}</Title>
      {isExpressionAwareStep && <ExpressionEditor selectedNode={props.selectedNode} />}
      {isDataFormatAwareStep && <DataFormatEditor selectedNode={props.selectedNode} />}
      {isLoadBalanceAwareStep && <p>Load balance strategy configuration is not yet supported.</p>}
      <AutoForm ref={formRef} schema={schema} model={model} onChangeModel={handleOnChange}>
        <AutoFields autoField={CustomAutoField} omitFields={omitFields} />
        <ErrorsField />
      </AutoForm>
    </ErrorBoundary>
  );
};
