import { AutoField, AutoFields, AutoForm, ErrorsField } from '@kaoto-next/uniforms-patternfly';
import { CodeBlock, CodeBlockCode, Title } from '@patternfly/react-core';
import set from 'lodash.set';
import { FunctionComponent, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { stringify } from 'yaml';
import { EntitiesContext } from '../../../providers/entities.provider';
import { ErrorBoundary } from '../../ErrorBoundary';
import { SchemaService } from '../../Form';
import { CustomAutoFieldDetector } from '../../Form/CustomAutoField';
import './CanvasForm.scss';
import { DataFormatEditor } from '../../Form/dataFormat/DataFormatEditor';
import { LoadBalancerEditor } from '../../Form/loadBalancer/LoadBalancerEditor';
import { StepExpressionEditor } from '../../Form/stepExpression/StepExpressionEditor';
import { CanvasNode } from './canvas.models';

interface CanvasFormProps {
  selectedNode: CanvasNode;
}

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

  const handleOnChangeIndividualProp = useCallback(
    (path: string, value: unknown) => {
      if (!props.selectedNode.data?.vizNode) {
        return;
      }

      const newModel = props.selectedNode.data?.vizNode?.getComponentSchema()?.definition || {};
      set(newModel, path, value);
      props.selectedNode.data.vizNode.updateModel(newModel);
      entitiesContext?.updateSourceCodeFromEntities();
    },
    [entitiesContext, props.selectedNode.data?.vizNode],
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

  const isUnknownComponent = useMemo(() => {
    return schema?.schema === undefined || Object.keys(schema?.schema).length === 0;
  }, [schema]);

  return (
    <ErrorBoundary key={props.selectedNode.id} fallback={<p>This node cannot be configured yet</p>}>
      <Title headingLevel="h1">{componentName}</Title>
      <div className="canvas-form">
        {isUnknownComponent ? (
          <CodeBlock>
            <CodeBlockCode>{stringify(model)}</CodeBlockCode>
          </CodeBlock>
        ) : (
          <AutoField.componentDetectorContext.Provider value={CustomAutoFieldDetector}>
            {isExpressionAwareStep && <StepExpressionEditor selectedNode={props.selectedNode} />}
            {isDataFormatAwareStep && <DataFormatEditor selectedNode={props.selectedNode} />}
            {isLoadBalanceAwareStep && <LoadBalancerEditor selectedNode={props.selectedNode} />}
            <AutoForm
              ref={formRef}
              schema={schema}
              model={model}
              onChange={handleOnChangeIndividualProp}
              data-testid="autoform"
            >
              <AutoFields omitFields={SchemaService.OMIT_FORM_FIELDS} />
              <ErrorsField />
            </AutoForm>
          </AutoField.componentDetectorContext.Provider>
        )}
      </div>
    </ErrorBoundary>
  );
};
