import { FunctionComponent } from 'react';
import { IVisualizationNode } from '../../models';

export interface IRegisteredComponent {
  anchor: string;
  activationFn: (vizNode: IVisualizationNode) => boolean;
  component: FunctionComponent<{ vizNode: IVisualizationNode }>;
}

export interface IRegisteredValidatedComponent {
  key: string;
  Component: IRegisteredComponent['component'];
}

export interface IRenderingAnchorContext {
  /**
   * Register a component to be rendered in the given anchor
   *
   * @example
   * ```tsx
   *    const renderingAnchorContext = useContext(RenderingAnchorContext);
   *
   *    renderingAnchorContext.registerComponent({
   *      anchor: 'form-header',
   *      activationFn: () => true,
   *      component: ({ vizNode }) => <h1>{vizNode.getId()}</h1>,
   *    });
   * ```
   * @param props Registered component definition
   * @returns void
   */
  registerComponent: (props: IRegisteredComponent) => void;

  /**
   * Get components registered to the given anchor and pass the validation function
   *
   * @example
   * ```tsx
   *    const renderingAnchorContext = useContext(RenderingAnchorContext);
   *
   *    const components = renderingAnchorContext.getRegisteredComponents('form-header', vizNode);
   *
   *    return (
   *      <div>
   *        {components.map(({ key, Component }) => (
   *          <Component key={key} vizNode={vizNode} />
   *        ))}
   *      </div>
   *    );
   * ```
   * @param anchorTag The anchor tag to register the component to
   * @param vizNode   The visualization node to pass to the component
   * @returns `IRegisteredValidatedComponent[]` An array of registered and validated components
   */
  getRegisteredComponents: (anchorTag: string, vizNode: IVisualizationNode) => IRegisteredValidatedComponent[];
}
