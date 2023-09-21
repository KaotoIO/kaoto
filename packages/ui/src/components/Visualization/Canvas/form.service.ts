import get from 'lodash.get';
import { CanvasNode } from './canvas.models';

export class FormService {
  static getSchema(node: CanvasNode) {
    const vizNode = node.data?.vizNode;
    const definition = vizNode?.getRootNode().getBaseEntity();
    const path = vizNode?.path;

    if (!definition || !path) throw new Error('No definition or path');

    const model = get(definition, path);
    const camelComponentName = this.getCamelComponentName(path, model);

    console.log(path, camelComponentName, model);
  }

  /**
   * TODO: Evaluate move this method somewhere else, for instance:
   * - In a dedicated service that could be leveraged later on by the dedicated flows classes (Route, KameletBinding, etc...)
   *   per each node
   * - As part of the VisualizationNode class
   * After that, this same method could be used to get the label for the node in the canvas
   *
   * TODO: Provide a better type for the definition parameter
   */
  static getCamelComponentName(path: string, definition: any): string {
    const splitPath = path.split('.');
    const lastPathSegment = splitPath[splitPath.length - 1];
    const pathAsIndex = Number.parseInt(lastPathSegment, 10);

    /**
     * If the last path segment is NaN, it means this is a special property
     * for instance, the `from`, `when` or `otherwise` properties in a Route
     * and we can just return the path as the name of the component
     */
    if (Number.isNaN(pathAsIndex)) return lastPathSegment;

    /**
     * The last path segment is a number, it means is part of a list of components
     * and we need to get the name of the component from the definition
     */
    const propertiesList = Object.keys(definition);
    if (propertiesList.length !== 1) {
      throw new Error('No properties or more than one found in definition');
    }

    const componentName = propertiesList[0];

    switch (componentName) {
      case 'from':
        return this.getNameFromUri(definition[componentName].uri);
      case 'to':
        /** The To processor is using `to: timer:tick?period=1000` form */
        if (typeof definition[componentName] === 'string') {
          return this.getNameFromUri(definition[componentName]);
        }

        /** The To processor is using `to: { uri: 'timer:tick?period=1000' }` form */
        return this.getNameFromUri(definition[componentName].uri);
      default:
        return componentName;
    }
  }

  /**
   * Extract the component name from the endpoint uri
   * An URI is composed by a component name and query parameters, separated by a colon
   * For instance: `timer:tick?period=1000`
   */
  private static getNameFromUri(uri: string): string {
    const uriParts = uri.split(':');

    return uriParts[0];
  }
}
