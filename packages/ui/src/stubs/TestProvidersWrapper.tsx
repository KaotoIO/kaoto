import { SuggestionRegistryProvider } from '@kaoto/forms';
import { FunctionComponent, PropsWithChildren } from 'react';
import type { Mock } from 'vitest';

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
  updateEntitiesFromCamelResourceSpy: Mock;
  updateSourceCodeFromEntitiesSpy: Mock;
}

export const TestProvidersWrapper = async (
  props: TestProviderWrapperProps = {},
): Promise<TestProvidersWrapperResult> => {
  const camelResource = props.camelResource ?? new CamelRouteResource([camelRouteJson]);
  // The wrapper is the single initialization point for the resource it renders,
  // whether created here or injected. initialize() is re-runnable, so this is
  // safe even if the caller already initialized — but callers should NOT mutate
  // a resource in memory (e.g. addNewEntity) before handing it over, because
  // this re-init rebuilds entities from source. Express fixtures as source data.
  await camelResource.initialize();
  const currentSchemaType = camelResource.getType();
  const updateEntitiesFromCamelResourceSpy = vi.fn();
  const updateSourceCodeFromEntitiesSpy = vi.fn();

  const dispatchSpy = vi.fn();
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
