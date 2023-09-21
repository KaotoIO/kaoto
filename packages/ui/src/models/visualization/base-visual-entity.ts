import { CatalogCamelComponent, CatalogCamelProcessor, CatalogKamelet } from '../camel-catalog-index';
import { BaseCamelEntity, EntityType } from '../camel-entities/base-entity';

/**
 * BaseVisualCamelEntity
 *
 * This interface is used to represent a visual Camel entity.
 * f.i. Camel Route, Kamelet, KameletBinding, etc.
 * All dedicated Camel code would implemented using this interface.
 */
export interface BaseVisualCamelEntity extends BaseCamelEntity {
  id: string;
  type: EntityType;

  getId: () => string;

  /** Given a path, get the component type and definition */
  getStepDefinition: (path: string) => CatalogCamelComponent | CatalogCamelProcessor | CatalogKamelet;

  /** Retrieve the steps from the underlying Camel entity */
  getSteps: () => unknown[];

  /** Generates a IVisualizationNode from the underlying Camel entity */
  toVizNode: () => IVisualizationNode;
}

/**
 * IVisualizationNode
 *
 * This interface is used to represent a node in the visualization tree.
 * Usually, each IVisualizationNode represent a component in a BaseVisualCamelEntity.
 *
 * This interface shouldn't know anything about the specific BaseVisualCamelEntity.
 */
export interface IVisualizationNode {
  id: string;
  path: string | undefined;
  label: string;

  getData(): BaseVisualCamelEntity | undefined;

  getRootNode(): IVisualizationNode;

  getParentNode(): IVisualizationNode | undefined;

  setParentNode(parentNode?: IVisualizationNode): void;

  getPreviousNode(): IVisualizationNode | undefined;

  setPreviousNode(previousNode: IVisualizationNode): void;

  getNextNode(): IVisualizationNode | undefined;

  setNextNode(node: IVisualizationNode): void;

  getChildren(): IVisualizationNode[] | undefined;

  setChildren(children: IVisualizationNode[]): void;

  addChild(child: IVisualizationNode): void;

  removeChild(child: IVisualizationNode): void;

  populateLeafNodesIds(ids: string[]): void;
}
