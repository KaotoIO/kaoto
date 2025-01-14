import { useContext } from 'react';
import { IVisualizationNode } from '../models';
import { EntitiesContext, SourceCodeContext } from '../providers';

export const useVizNodeModel = <T = unknown>(
  vizNode: IVisualizationNode,
): { model: T; updateModel: (model: unknown) => void; sourceCode: string } => {
  const entitiesContext = useContext(EntitiesContext);
  const sourceCode = useContext(SourceCodeContext);
  const model = vizNode.getComponentSchema()?.definition ?? {};

  const updateModel = (newModel: unknown) => {
    vizNode.updateModel(newModel);
    entitiesContext?.updateSourceCodeFromEntities();
  };

  return { model, updateModel, sourceCode };
};
