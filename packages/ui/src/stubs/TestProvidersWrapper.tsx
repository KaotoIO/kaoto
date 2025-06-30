import { SuggestionRegistryProvider } from '@kaoto/forms';
import { FunctionComponent, PropsWithChildren } from 'react';
import { CamelResource } from '../models/camel/camel-resource';
import { CamelRouteResource } from '../models/camel/camel-route-resource';
import { VisualFlowsApi } from '../models/visualization/flows/support/flows-visibility';
import { EntitiesContext, EntitiesContextResult, VisibleFlowsContext, VisibleFlowsContextResult } from '../providers';
import { camelRouteJson } from './camel-route';

interface TestProviderWrapperProps extends PropsWithChildren {
  camelResource?: CamelResource;
  visibleFlowsContext?: VisibleFlowsContextResult;
}

interface TestProvidersWrapperResult {
  Provider: FunctionComponent<PropsWithChildren>;
  camelResource: CamelResource;
  updateEntitiesFromCamelResourceSpy: EntitiesContextResult['updateEntitiesFromCamelResource'];
  updateSourceCodeFromEntitiesSpy: EntitiesContextResult['updateSourceCodeFromEntities'];
}

export const TestProvidersWrapper = (props: TestProviderWrapperProps = {}): TestProvidersWrapperResult => {
  const camelResource = props.camelResource ?? new CamelRouteResource([camelRouteJson]);
  const currentSchemaType = camelResource.getType();
  const updateEntitiesFromCamelResourceSpy = jest.fn();
  const updateSourceCodeFromEntitiesSpy = jest.fn();

  const dispatchSpy = jest.fn();
  const visibleFlowsContext: VisibleFlowsContextResult = {
    allFlowsVisible: props.visibleFlowsContext?.allFlowsVisible ?? false,
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
          updateEntitiesFromCamelResource: updateEntitiesFromCamelResourceSpy,
          updateSourceCodeFromEntities: updateSourceCodeFromEntitiesSpy,
        } as unknown as EntitiesContextResult
      }
    >
      <VisibleFlowsContext.Provider value={visibleFlowsContext}>
        <SuggestionRegistryProvider>{props.children}</SuggestionRegistryProvider>
      </VisibleFlowsContext.Provider>
    </EntitiesContext.Provider>
  );

  return { Provider, camelResource, updateEntitiesFromCamelResourceSpy, updateSourceCodeFromEntitiesSpy };
};
