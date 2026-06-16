import { SuggestionRegistryProvider } from '@kaoto/forms';
import { FunctionComponent, PropsWithChildren } from 'react';

import { CamelRouteResource } from '../models/camel/camel-route-resource';
import { KaotoResource } from '../models/kaoto-resource';
import { VisualFlowsApi } from '../models/visualization/flows/support/flows-visibility';
import {
  EntitiesContext,
  EntitiesContextResult,
  KaotoResourceContext,
  VisibleFlowsContext,
  VisibleFlowsContextResult,
} from '../providers';
import { camelRouteJson } from './camel-route';

interface TestProviderWrapperProps extends PropsWithChildren {
  camelResource?: KaotoResource;
  visibleFlowsContext?: VisibleFlowsContextResult;
  entitiesContextValue?: EntitiesContextResult | null;
}

interface TestProvidersWrapperResult {
  Provider: FunctionComponent<PropsWithChildren>;
  camelResource: KaotoResource;
  updateEntitiesFromCamelResourceSpy: jest.Mock;
  updateSourceCodeFromEntitiesSpy: jest.Mock;
}

export const TestProvidersWrapper = (props: TestProviderWrapperProps = {}): TestProvidersWrapperResult => {
  const camelResource = props.camelResource ?? new CamelRouteResource([camelRouteJson]);
  if (!props.camelResource) {
    camelResource.initialize();
  }
  const currentSchemaType = camelResource.getType();
  const updateEntitiesFromCamelResourceSpy = jest.fn();
  const updateSourceCodeFromEntitiesSpy = jest.fn();

  const dispatchSpy = jest.fn();
  const visibleFlowsContext: VisibleFlowsContextResult = {
    allFlowsVisible: props.visibleFlowsContext?.allFlowsVisible ?? false,
    visibleFlows: props.visibleFlowsContext?.visibleFlows ?? {},
    visualFlowsApi: props.visibleFlowsContext?.visualFlowsApi ?? new VisualFlowsApi(dispatchSpy),
  };

  const entitiesContextValue: EntitiesContextResult | null =
    props.entitiesContextValue === undefined
      ? {
          camelResource,
          entities: camelResource.getEntities(),
          visualEntities: camelResource.getVisualEntities(),
          currentSchemaType,
          updateEntitiesFromCamelResource: updateEntitiesFromCamelResourceSpy,
          updateSourceCodeFromEntities: updateSourceCodeFromEntitiesSpy,
        }
      : props.entitiesContextValue;

  const entitiesContextKey = Date.now();
  const kaotoResourceContextValue = { kaotoResource: camelResource };
  const Provider: FunctionComponent<PropsWithChildren> = (props) => (
    <KaotoResourceContext.Provider value={kaotoResourceContextValue}>
      <EntitiesContext.Provider key={entitiesContextKey} value={entitiesContextValue}>
        <VisibleFlowsContext.Provider value={visibleFlowsContext}>
          <SuggestionRegistryProvider>{props.children}</SuggestionRegistryProvider>
        </VisibleFlowsContext.Provider>
      </EntitiesContext.Provider>
    </KaotoResourceContext.Provider>
  );

  return { Provider, camelResource, updateEntitiesFromCamelResourceSpy, updateSourceCodeFromEntitiesSpy };
};
