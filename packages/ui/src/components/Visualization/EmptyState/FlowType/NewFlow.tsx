import { PlusIcon } from '@patternfly/react-icons';
import { FunctionComponent, PropsWithChildren, useCallback, useContext, useState } from 'react';

import { useEntityContext } from '../../../../hooks/useEntityContext/useEntityContext';
import { ISourceSchema, sourceSchemaConfig, SourceSchemaType } from '../../../../models/camel';
import { VisibleFlowsContext } from '../../../../providers/visible-flows.provider';
import { ConfirmIntegrationTypeChangeModal } from '../../ConfirmIntegrationTypeChangeModal/ConfirmIntegrationTypeChangeModal';
import { FlowTypeSelector } from './FlowTypeSelector';

export const NewFlow: FunctionComponent<PropsWithChildren> = () => {
  const { currentSchemaType, camelResource, updateEntitiesFromCamelResource } = useEntityContext();
  const currentFlowType: ISourceSchema = sourceSchemaConfig.config[currentSchemaType];
  const visibleFlowsContext = useContext(VisibleFlowsContext)!;
  const [proposedFlowType, setProposedFlowType] = useState<SourceSchemaType>();

  const checkBeforeAddNewFlow = useCallback(
    (flowType: SourceSchemaType) => {
      const isSameSourceType = currentSchemaType === flowType;

      if (isSameSourceType) {
        /**
         * If it's the same DSL as we have in the existing Flows list,
         * we don't need to do anything special, just add a new flow if
         * supported
         */
        const newId = camelResource.addNewEntity();
        visibleFlowsContext.visualFlowsApi.hideFlows();
        visibleFlowsContext.visualFlowsApi.toggleFlowVisible(newId);
        updateEntitiesFromCamelResource();
      } else {
        /**
         * If it is not the same DSL, this operation might result in
         * removing the existing flows, so then we warn the user first
         */
        setProposedFlowType(flowType);
      }
    },
    [camelResource, currentSchemaType, updateEntitiesFromCamelResource, visibleFlowsContext.visualFlowsApi],
  );

  return (
    <>
      <FlowTypeSelector onSelect={checkBeforeAddNewFlow}>
        <div
          title={
            currentFlowType.multipleRoute
              ? `Add a new ${currentFlowType.name} route`
              : `The ${currentFlowType.name} type does not support multiple routes`
          }
        >
          <PlusIcon />
          <span className="pf-v6-u-m-sm">New</span>
        </div>
      </FlowTypeSelector>
      <ConfirmIntegrationTypeChangeModal
        proposedFlowType={proposedFlowType}
        onClose={() => {
          setProposedFlowType(undefined);
        }}
      />
    </>
  );
};
