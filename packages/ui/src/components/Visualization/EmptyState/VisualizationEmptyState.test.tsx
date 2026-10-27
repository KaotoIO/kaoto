import { render } from '@testing-library/react';

import { TestProvidersWrapper, TestRuntimeProviderWrapper } from '../../../stubs';
import { VisualizationEmptyState } from './VisualizationEmptyState';

describe('VisualizationEmptyState.tsx', () => {
  describe('when there are no routes', () => {
    it('should render the not-found image whenever there are no routes', async () => {
      const RuntimeProvider = TestRuntimeProviderWrapper().Provider;
      const { Provider } = await TestProvidersWrapper();
      const wrapper = render(
        <RuntimeProvider>
          <Provider>
            <VisualizationEmptyState entitiesNumber={0} />
          </Provider>
        </RuntimeProvider>,
      );

      const icon = wrapper.getByAltText('not found');

      expect(icon).toBeInTheDocument();
    });

    it('should state that there are no routes', async () => {
      const RuntimeProvider = TestRuntimeProviderWrapper().Provider;
      const { Provider } = await TestProvidersWrapper();
      const wrapper = render(
        <RuntimeProvider>
          <Provider>
            <VisualizationEmptyState entitiesNumber={0} />
          </Provider>
        </RuntimeProvider>,
      );

      const noRoutesTitle = wrapper.getByText('There are no routes defined');
      const noRoutesSuggestion = wrapper.getByText('You can create a new route using the New button');

      expect(noRoutesTitle).toBeInTheDocument();
      expect(noRoutesSuggestion).toBeInTheDocument();
    });
  });

  describe('when there are routes but they are not visible', () => {
    it('should render the no-data image whenever there are routes but they are not visible', async () => {
      const RuntimeProvider = TestRuntimeProviderWrapper().Provider;
      const { Provider } = await TestProvidersWrapper();
      const wrapper = render(
        <RuntimeProvider>
          <Provider>
            <VisualizationEmptyState entitiesNumber={1} />
          </Provider>
        </RuntimeProvider>,
      );
      const icon = wrapper.getByAltText('no data');

      expect(icon).toBeInTheDocument();
    });

    it('should state that there are no visible routes', async () => {
      const RuntimeProvider = TestRuntimeProviderWrapper().Provider;
      const { Provider } = await TestProvidersWrapper();
      const wrapper = render(
        <RuntimeProvider>
          <Provider>
            <VisualizationEmptyState entitiesNumber={1} />
          </Provider>
        </RuntimeProvider>,
      );
      const noRoutesTitle = wrapper.getByText('There are no visible routes');

      expect(noRoutesTitle).toBeInTheDocument();
    });
  });
});
