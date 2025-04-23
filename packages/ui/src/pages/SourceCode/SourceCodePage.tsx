import { FunctionComponent, useCallback, useContext } from 'react';
import { SourceCode } from '../../components/SourceCode';
import { SourceCodeApiContext, SourceCodeContext } from '../../providers/source-code.provider';
import { VisibleFlowsContext } from '../../providers/visible-flows.provider';
import { EntitiesContext } from '../../providers/entities.provider';
import { CamelResourceFactory } from '../../models/camel/camel-resource-factory';

export const SourceCodePage: FunctionComponent = () => {
  const sourceCodeContext = useContext(SourceCodeContext);
  const sourceCodeApiContext = useContext(SourceCodeApiContext);
  // const entitiesContext = useContext(EntitiesContext);
  const { visualFlowsApi } = useContext(VisibleFlowsContext)!;

  const handleCodeChange = useCallback(
    (code: string) => {
      /** Update Entities and Visual Entities */
      sourceCodeApiContext.setCodeAndNotify(code);

      const camelResource = CamelResourceFactory.createCamelResource(code);
      const visualEntities = camelResource.getVisualEntities();
      const visualEntitiesIds = visualEntities.map((entity) => entity.id) ?? [];
      visualFlowsApi.initVisibleFlows(visualEntitiesIds);
    },
    [sourceCodeApiContext, visualFlowsApi],
  );

  return <SourceCode code={sourceCodeContext ?? ''} onCodeChange={handleCodeChange} />;
};
