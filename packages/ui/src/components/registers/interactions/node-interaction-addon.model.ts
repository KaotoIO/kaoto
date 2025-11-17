import { IVisualizationNode } from '../../../models';
import { IClipboardCopyObject } from '../../../models/visualization/clipboard';
import { ActionConfirmationButtonOption } from '../../../providers';

export enum IInteractionType {
  ON_DELETE = 'onDelete',
  ON_COPY = 'onCopy',
  ON_DUPLICATE = 'onDuplicate',
  ON_PASTE = 'onPaste',
}

export interface IModalCustomization {
  buttonOptions: Record<string, ActionConfirmationButtonOption>;
  additionalText?: string;
}

/**
 * Registered interaction addon.
 */
export type IRegisteredInteractionAddon = IOnDeleteAddon | IOnCopyAddon | IOnDuplicateAddon | IOnPasteAddon;

export interface IOnDeleteAddon {
  type: IInteractionType.ON_DELETE;
  activationFn: (vizNode: IVisualizationNode) => boolean;
  callback: (parameters: { vizNode: IVisualizationNode; modalAnswer: string | undefined }) => void;
  modalCustomization?: IModalCustomization;
}

export interface IOnCopyAddon {
  type: IInteractionType.ON_COPY;
  activationFn: (vizNode: IVisualizationNode) => boolean;
  callback: (parameters: {
    sourceVizNode: IVisualizationNode;
    content: IClipboardCopyObject | undefined;
  }) => IClipboardCopyObject;
}

export interface IOnDuplicateAddon {
  type: IInteractionType.ON_DUPLICATE;
  activationFn: (vizNode: IVisualizationNode) => boolean;
  callback: (parameters: {
    sourceVizNode: IVisualizationNode;
    content: IClipboardCopyObject | undefined;
  }) => Promise<IClipboardCopyObject>;
}

export interface IOnPasteAddon {
  type: IInteractionType.ON_PASTE;
  activationFn: (vizNode: IVisualizationNode) => boolean;
  callback: (parameters: {
    targetVizNode: IVisualizationNode;
    originalContent: IClipboardCopyObject | undefined;
    updatedContent: IClipboardCopyObject | undefined;
  }) => Promise<void>;
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
  registerInteractionAddon: (addon: IRegisteredInteractionAddon) => void;

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
   * @param vizNode   The visualization node to pass to the interaction. If not provided, returns all addons of the given type.
   * @returns `IRegisteredInteraction` An array of registered interactions
   */
  getRegisteredInteractionAddons: (
    type: IInteractionType,
    vizNode?: IVisualizationNode,
  ) => IRegisteredInteractionAddon[];
}
