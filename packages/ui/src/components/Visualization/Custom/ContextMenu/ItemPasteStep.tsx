import { ContextMenuItem } from '@patternfly/react-topology';
import { FunctionComponent, PropsWithChildren, useContext } from 'react';
import { IDataTestID } from '../../../../models';
import { AddStepMode, IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { usePasteStep } from '../hooks/paste-step.hook';
import { ClipboardManager } from '../../../../utils/ClipboardManager';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { CatalogModalContext } from '../../../../providers/catalog-modal.provider';
import { SourceSchemaType } from '../../../../models/camel/source-schema-type';

interface ItemPasteStepProps extends PropsWithChildren<IDataTestID> {
  vizNode: IVisualizationNode;
  mode: AddStepMode;
}

export const ItemPasteStep: FunctionComponent<ItemPasteStepProps> = (props) => {
  const entitiesContext = useContext(EntitiesContext)!;
  const catalogModalContext = useContext(CatalogModalContext);
  const { onPasteStep } = usePasteStep(props.vizNode, props.mode);
  let isPasteCompatible = false;

  try {
    const pastedNodeValue = ClipboardManager.paste();
    if (pastedNodeValue) {
      const pastedNodeType = pastedNodeValue.type;
      const baseNodeType = entitiesContext.camelResource.getType();
      const isSameType = pastedNodeType === baseNodeType;
      const isCompatibeType =
        (pastedNodeType === SourceSchemaType.Route || pastedNodeType === SourceSchemaType.Kamelet) &&
        (baseNodeType === SourceSchemaType.Route || baseNodeType === SourceSchemaType.Kamelet);

      /** Validate the pasted node */
      if (isSameType || isCompatibeType) {
        /** Get compatible nodes and the location where can be introduced */
        const filter = entitiesContext.camelResource.getCompatibleComponents(
          props.mode,
          props.vizNode.data,
          props.vizNode.getComponentSchema()?.definition,
        );

        /** Check paste compatibilty */
        isPasteCompatible = catalogModalContext?.checkCompatibility(pastedNodeValue.name, filter) ?? false;
      }
    }
  } catch (err) {
    console.error('Failed to paste step:', err);
  }

  if (!isPasteCompatible) return null;

  return (
    <ContextMenuItem onClick={onPasteStep} data-testid={props['data-testid']}>
      {props.children}
    </ContextMenuItem>
  );
};
