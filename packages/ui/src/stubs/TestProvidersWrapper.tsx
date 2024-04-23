import { FunctionComponent, PropsWithChildren } from 'react';
import { EntitiesContextResult } from '../hooks';
import { CamelResource } from '../models/camel/camel-resource';
import { CamelRouteResource } from '../models/camel/camel-route-resource';
import { VisualFlowsApi } from '../models/visualization/flows/support/flows-visibility';
import { EntitiesContext, VisibleFLowsContextResult, VisibleFlowsContext } from '../providers';
import { camelRouteJson } from './camel-route';

interface TestProviderWrapperProps extends PropsWithChildren {
  camelResource?: CamelResource;
  visibleFlowsContext?: VisibleFLowsContextResult;
}

interface TestProvidersWrapperResult {
  Provider: FunctionComponent<PropsWithChildren>;
  setCurrentSchemaTypeSpy: EntitiesContextResult['setCurrentSchemaType'];
  updateEntitiesFromCamelResourceSpy: EntitiesContextResult['updateEntitiesFromCamelResource'];
  updateSourceCodeFromEntitiesSpy: EntitiesContextResult['updateSourceCodeFromEntities'];
}

export const TestProvidersWrapper = (props: TestProviderWrapperProps = {}): TestProvidersWrapperResult => {
  const camelResource = props.camelResource ?? new CamelRouteResource(camelRouteJson);
  const currentSchemaType = camelResource.getType();
  const setCurrentSchemaTypeSpy = jest.fn();
  const updateEntitiesFromCamelResourceSpy = jest.fn();
  const updateSourceCodeFromEntitiesSpy = jest.fn();

  const dispatchSpy = jest.fn();
  const visibleFlowsContext: VisibleFLowsContextResult = {
    visibleFlows: props.visibleFlowsContext?.visibleFlows ?? {},
    visualFlowsApi: props.visibleFlowsContext?.visualFlowsApi ?? new VisualFlowsApi(dispatchSpy),
  };

  const Provider: FunctionComponent<PropsWithChildren> = (props) => (
    <EntitiesContext.Provider
      key={Date.now()}
      value={
        {
          camelResource,
          entities: camelResource.getEntities(),
          visualEntities: camelResource.getVisualEntities(),
          currentSchemaType,
          setCurrentSchemaType: setCurrentSchemaTypeSpy,
          updateEntitiesFromCamelResource: updateEntitiesFromCamelResourceSpy,
          updateSourceCodeFromEntities: updateSourceCodeFromEntitiesSpy,
        } as unknown as EntitiesContextResult
      }
    >
      <VisibleFlowsContext.Provider value={visibleFlowsContext}>{props.children}</VisibleFlowsContext.Provider>
    </EntitiesContext.Provider>
  );

  return { Provider, setCurrentSchemaTypeSpy, updateEntitiesFromCamelResourceSpy, updateSourceCodeFromEntitiesSpy };
};
