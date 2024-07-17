import {
  Card,
  CardBody,
  CardExpandableContent,
  CardHeader,
  CardTitle,
  SelectOptionProps,
} from '@patternfly/react-core';
import { FunctionComponent, useCallback, useContext, useMemo, useState } from 'react';
import { EntitiesContext } from '../../../providers';
import { CanvasNode } from '../../Visualization/Canvas/canvas.models';
import { LoadBalancerService } from './loadbalancer.service';
import './LoadBalancerEditor.scss';
import { TypeaheadEditor } from '../customField/TypeaheadEditor';
import { getSerializedModel, getUserUpdatedPropertiesSchema, isDefined } from '../../../utils';
import { FormTabsModes } from '../../Visualization/Canvas/canvasformtabs.modes';

interface LoadBalancerEditorProps {
  selectedNode: CanvasNode;
  formMode: FormTabsModes;
}

export const LoadBalancerEditor: FunctionComponent<LoadBalancerEditorProps> = (props) => {
  const entitiesContext = useContext(EntitiesContext);
  const [isExpanded, setIsExpanded] = useState(true);

  const loadBalancerCatalogMap = useMemo(() => {
    return LoadBalancerService.getLoadBalancerMap();
  }, []);

  const initialLoadBalancerOptions: SelectOptionProps[] = useMemo(() => {
    return Object.values(loadBalancerCatalogMap).map((option) => {
      return {
        value: option.model.name,
        children: option.model.title,
        description: option.model.description,
      };
    });
  }, [loadBalancerCatalogMap]);

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

  const loadBalancerOption = loadBalancer && {
    name: loadBalancer!.model.name,
    title: loadBalancer!.model.title,
  };
  const [selectedLoadBalancerOption, setSelectedLoadBalancerOption] = useState<
    { name: string; title: string } | undefined
  >(loadBalancerOption);

  const loadBalancerSchema = useMemo(() => {
    return LoadBalancerService.getLoadBalancerSchema(loadBalancer);
  }, [loadBalancer]);

  const processedSchema = useMemo(() => {
    if (props.formMode === FormTabsModes.ALL_FIELDS) return loadBalancerSchema;
    return {
      ...loadBalancerSchema,
      properties: getUserUpdatedPropertiesSchema(loadBalancerSchema?.properties ?? {}, loadBalancerModel ?? {}),
    };
  }, [props.formMode, loadBalancer]);

  const handleOnChange = useCallback(
    (
      selectedLoadBalancerOption: { name: string; title: string } | undefined,
      newLoadBalancerModel: Record<string, unknown>,
    ) => {
      setSelectedLoadBalancerOption(selectedLoadBalancerOption);
      const model = props.selectedNode.data?.vizNode?.getComponentSchema()?.definition;
      if (!model) return;
      LoadBalancerService.setLoadBalancerModel(
        loadBalancerCatalogMap,
        model,
        selectedLoadBalancerOption ? selectedLoadBalancerOption!.name : '',
        getSerializedModel(newLoadBalancerModel),
      );
      props.selectedNode.data?.vizNode?.updateModel(model);
      entitiesContext?.updateSourceCodeFromEntities();
    },
    [entitiesContext, loadBalancerCatalogMap, props.selectedNode.data?.vizNode],
  );

  const showEditor = useMemo(() => {
    if (props.formMode === FormTabsModes.ALL_FIELDS) return true;
    return props.formMode === FormTabsModes.USER_MODIFIED && isDefined(selectedLoadBalancerOption);
  }, [props.formMode]);

  if (!showEditor) return null;

  return (
    <div className="loadbalancer-metadata-editor">
      <Card isCompact={true} isExpanded={isExpanded} className="loadbalancer-metadata-editor-card">
        <CardHeader onExpand={() => setIsExpanded(!isExpanded)}>
          <CardTitle>Load Balancer</CardTitle>
        </CardHeader>
        <CardExpandableContent>
          <CardBody data-testid={'loadbalancer-config-card'}>
            <TypeaheadEditor
              selectOptions={initialLoadBalancerOptions}
              title="loadbalancer"
              selected={selectedLoadBalancerOption}
              selectedModel={loadBalancerModel}
              selectedSchema={processedSchema}
              selectionOnChange={handleOnChange}
            />
          </CardBody>
        </CardExpandableContent>
      </Card>
    </div>
  );
};
