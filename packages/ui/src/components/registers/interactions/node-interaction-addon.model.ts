import { IVisualizationNode } from '../../../models';
import { ActionConfirmationButtonOption } from '../../../providers';
import { IClipboardCopyObject } from '../../../models/visualization/clipboard';

export enum IInteractionType {
  ON_DELETE = 'onDelete',
  ON_COPY = 'onCopy',
}

export interface IModalCustomization {
  buttonOptions: Record<string, ActionConfirmationButtonOption>;
  additionalText?: string;
}

export type IInteractionAddonType = IOnDeleteAddon | IOnCopyAddon;

/**
 * Registered interaction addon.
 * @template T The type of interaction addon (ON_DELETE, ON_COPY, etc)
 */
export type IRegisteredInteractionAddon<T extends IInteractionType = IInteractionType> = Extract<
  IInteractionAddonType,
  { type: T }
>;

export interface IOnDeleteAddon {
  type: IInteractionType.ON_DELETE;
  activationFn: (vizNode: IVisualizationNode) => boolean;
  callback: (vizNode: IVisualizationNode, modalAnswer: string | undefined) => void;
  modalCustomization?: IModalCustomization;
}

export interface IOnCopyAddon {
  type: IInteractionType.ON_COPY;
  activationFn: (vizNode: IVisualizationNode) => boolean;
  callback: (sourceVizNode: IVisualizationNode, content: IClipboardCopyObject | undefined) => IClipboardCopyObject;
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
   *      type: IInteractionType.ON_DELETE
   *      activationFn: () => true,
   *      callback: () => { doSomething() }
   *    });
   * ```
   * @param addon Registered node interaction addon
   * @returns void
   */
  registerInteractionAddon: <T extends IInteractionType>(addon: IRegisteredInteractionAddon<T>) => void;

  /**
   * Get registered interaction addons
   *
   * @example
   * ```tsx
   *    const nodeInteractionAddonContext = useContext(NodeInteractionAddonContext);
   *
   *    const addons = nodeInteractionAddonContext.getRegisteredInteractionAddons(IInteractionType.ON_DELETE, vizNode);
   *    addons.forEach((addon) => {
   *      addon.callback(vizNode, ACTION_ID_CONFIRM);
   *    });
   * ```
   * @param type   The interaction addon type enum value
   * @param vizNode   The visualization node to pass to the interaction
   * @returns `IRegisteredInteraction` An array of registered interactions
   */
  getRegisteredInteractionAddons: <T extends IInteractionType>(
    type: T,
    vizNode: IVisualizationNode,
  ) => IRegisteredInteractionAddon<T>[];
}
