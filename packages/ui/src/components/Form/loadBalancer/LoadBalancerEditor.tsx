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
  Text,
  TextContent,
  TextVariants,
} from '@patternfly/react-core';
import { FunctionComponent, Ref, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { EntitiesContext } from '../../../providers';
import { MetadataEditor } from '../../MetadataEditor';
import { CanvasNode } from '../../Visualization/Canvas/canvas.models';
import { LoadBalancerService } from './loadbalancer.service';
import { SchemaService } from '../schema.service';
import './LoadBalancerEditor.scss';
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
  useEffect(() => {
    loadBalancer ? setSelected(loadBalancer.model.name) : setSelected('');
  }, [loadBalancer]);

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
      setIsOpen(false);
      if ((!loadBalancer && value === '') || value === loadBalancer?.model.name) return;
      setSelected(value as string);
      handleOnChange(value as string, {});
    },
    [handleOnChange, loadBalancer],
  );

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
    [onToggleClick, isOpen, selected],
  );

  return (
    loadBalancerCatalogMap && (
      <Card isCompact={true} isExpanded={isExpanded}>
        <CardHeader onExpand={() => setIsExpanded(!isExpanded)}>
          <CardTitle>Load Balancer</CardTitle>
        </CardHeader>
        <CardExpandableContent>
          <CardBody data-testid={'loadbalancer-config-card'}>
            <Dropdown
              id="loadbalancer-select"
              data-testid="loadbalancer-dropdown"
              isOpen={isOpen}
              selected={selected !== '' ? selected : undefined}
              onSelect={onSelect}
              toggle={toggle}
              isScrollable={true}
            >
              <DropdownList data-testid="loadbalancer-dropdownlist">
                {Object.values(loadBalancerCatalogMap).map((lb) => {
                  return (
                    <DropdownItem
                      data-testid={`loadbalancer-dropdownitem-${lb.model.name}`}
                      key={lb.model.title}
                      value={lb.model.name}
                      description={lb.model.description}
                    >
                      {lb.model.title}
                    </DropdownItem>
                  );
                })}
              </DropdownList>
            </Dropdown>
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
