import { IVisualizationNode } from '../../../models';
import { ActionConfirmationButtonOption } from '../../../providers';

export enum IInteractionAddonType {
  ON_DELETE = 'onDelete',
}

export interface IModalCustomization {
  buttonOptions: Record<string, ActionConfirmationButtonOption>;
  additionalText?: string;
}

export interface IRegisteredInteractionAddon {
  type: IInteractionAddonType;
  activationFn: (vizNode: IVisualizationNode) => boolean;
  callback: (vizNode: IVisualizationNode, modalAnswer: string | undefined) => void;
  modalCustomization?: IModalCustomization;
}

export interface INodeInteractionAddonContext {
  /**
   * Register a node interaction addon to be processed on an associated node interaction
   *
   * @example
   * ```tsx
   *    const nodeInteractionAddonContext = useContext(NodeInteractionAddonContext);
   *
   *    nodeInteractionAddonContext.registerInteractionAddon({
   *      type: IInteractionAddonType.ON_DELETE
   *      activationFn: () => true,
   *      callback: () => { doSomething() }
   *    });
   * ```
   * @param addon Registered node interaction addon
   * @returns void
   */
  registerInteractionAddon: (addon: IRegisteredInteractionAddon) => void;

  /**
   * Get registered interaction addons
   *
   * @example
   * ```tsx
   *    const nodeInteractionAddonContext = useContext(NodeInteractionAddonContext);
   *
   *    const addons = nodeInteractionAddonContext.getRegisteredInteractionAddons(IInteractionAddonType.ON_DELETE, vizNode);
   *    addons.forEach((addon) => {
   *      addon.callback(vizNode, ACTION_ID_CONFIRM);
   *    });
   * ```
   * @param type   The interaction addon type enum value
   * @param vizNode   The visualization node to pass to the interaction
   * @returns `IRegisteredInteraction` An array of registered interactions
   */
  getRegisteredInteractionAddons: (
    type: IInteractionAddonType,
    vizNode: IVisualizationNode,
  ) => IRegisteredInteractionAddon[];
}
