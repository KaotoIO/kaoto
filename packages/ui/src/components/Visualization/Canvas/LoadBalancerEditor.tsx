import {
  Card,
  CardBody,
  CardExpandableContent,
  CardHeader,
  CardTitle,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  MenuToggleElement,
} from '@patternfly/react-core';
import { FunctionComponent, Ref, useCallback, useContext, useMemo, useState } from 'react';
import { EntitiesContext } from '../../../providers';
import { MetadataEditor } from '../../MetadataEditor';
import { CanvasNode } from './canvas.models';
import { LoadBalancerService } from './loadbalancer.service';

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
  const loadBalancerSchema = useMemo(() => {
    return LoadBalancerService.getLoadBalancerSchema(loadBalancer!);
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
      setIsOpen(false);
      if (value === loadBalancer!.model.name) return;
      handleOnChange(value as string, {});
    },
    [handleOnChange, loadBalancer],
  );

  const toggle = useCallback(
    (toggleRef: Ref<MenuToggleElement>) => (
      <MenuToggle ref={toggleRef} onClick={onToggleClick} isExpanded={isOpen}>
        {loadBalancer!.model.title}
      </MenuToggle>
    ),
    [loadBalancer, isOpen, onToggleClick],
  );

  return (
    loadBalancerCatalogMap &&
    loadBalancer && (
      <Card isCompact={true} isExpanded={isExpanded}>
        <CardHeader onExpand={() => setIsExpanded(!isExpanded)}>
          <CardTitle>LoadBalancer</CardTitle>
        </CardHeader>
        <CardExpandableContent>
          <CardBody data-testid={'loadbalancer-config-card'}>
            <Dropdown
              id="loadbalancer-select"
              data-testid="loadbalancer-dropdown"
              isOpen={isOpen}
              selected={loadBalancer.model.name}
              onSelect={onSelect}
              toggle={toggle}
              isScrollable={true}
            >
              <DropdownList data-testid="loadbalancer-dropdownlist">
                {Object.values(loadBalancerCatalogMap).map((loadBalancer) => {
                  return (
                    <DropdownItem
                      data-testid={`loadbalancer-dropdownitem-${loadBalancer.model.name}`}
                      key={loadBalancer.model.title}
                      value={loadBalancer.model.name}
                      description={loadBalancer.model.description}
                    >
                      {loadBalancer.model.title}
                    </DropdownItem>
                  );
                })}
              </DropdownList>
            </Dropdown>
            <MetadataEditor
              data-testid="loadbalancer-editor"
              name={'loadbalancer'}
              schema={loadBalancerSchema}
              metadata={loadBalancerModel}
              onChangeModel={(model) => handleOnChange(loadBalancer.model.name, model)}
            />
          </CardBody>
        </CardExpandableContent>
      </Card>
    )
  );
};
