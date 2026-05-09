import { act, fireEvent, render, waitFor } from '@testing-library/react';

import { CamelRouteResource } from '../../../../models/camel/camel-route-resource';
import { SerializerType } from '../../../../models/kaoto-resource';
import { TestProvidersWrapper } from '../../../../stubs';
import { camelRouteJson } from '../../../../stubs/camel-route';
import { SerializerSelector } from './SerializerSelector';

describe('SerializerSelector', () => {
  it('renders the toggle', () => {
    const { Provider } = TestProvidersWrapper();
    const wrapper = render(
      <Provider>
        <SerializerSelector />
      </Provider>,
    );

    expect(wrapper.queryByTestId('serializer-list-dropdown')).toBeInTheDocument();
  });

  it('shows the current serializer type as the toggle label', () => {
    const { Provider } = TestProvidersWrapper();
    const wrapper = render(
      <Provider>
        <SerializerSelector />
      </Provider>,
    );

    const toggle = wrapper.getByTestId('serializer-list-dropdown');
    expect(toggle).toHaveTextContent(SerializerType.YAML);
  });

  it('reveals both XML and YAML options when opened', async () => {
    const { Provider } = TestProvidersWrapper();
    const wrapper = render(
      <Provider>
        <SerializerSelector />
      </Provider>,
    );

    const toggle = wrapper.getByTestId('serializer-list-dropdown');
    act(() => {
      fireEvent.click(toggle);
    });

    expect(await wrapper.findByRole('option', { name: 'XML' })).toBeInTheDocument();
    expect(await wrapper.findByRole('option', { name: 'YAML' })).toBeInTheDocument();
  });

  it('calls setSerializer and updateSourceCodeFromEntities when a different serializer is selected', async () => {
    const camelResource = new CamelRouteResource([camelRouteJson]);
    const setSerializerSpy = jest.spyOn(camelResource, 'setSerializer');
    const { Provider, updateSourceCodeFromEntitiesSpy } = TestProvidersWrapper({ camelResource });

    const wrapper = render(
      <Provider>
        <SerializerSelector />
      </Provider>,
    );

    const toggle = wrapper.getByTestId('serializer-list-dropdown');
    act(() => {
      fireEvent.click(toggle);
    });

    const xmlOption = await wrapper.findByRole('option', { name: 'XML' });
    await act(async () => {
      fireEvent.click(xmlOption);
    });

    expect(setSerializerSpy).toHaveBeenCalledTimes(1);
    expect(setSerializerSpy).toHaveBeenCalledWith(SerializerType.XML);
    expect(updateSourceCodeFromEntitiesSpy).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(wrapper.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  it('does not call setSerializer when the already-selected serializer is clicked', async () => {
    const camelResource = new CamelRouteResource([camelRouteJson]);
    const setSerializerSpy = jest.spyOn(camelResource, 'setSerializer');
    const { Provider, updateSourceCodeFromEntitiesSpy } = TestProvidersWrapper({ camelResource });

    const wrapper = render(
      <Provider>
        <SerializerSelector />
      </Provider>,
    );

    const toggle = wrapper.getByTestId('serializer-list-dropdown');
    act(() => {
      fireEvent.click(toggle);
    });

    const yamlOption = await wrapper.findByRole('option', { name: 'YAML' });
    await act(async () => {
      fireEvent.click(yamlOption);
    });

    expect(setSerializerSpy).not.toHaveBeenCalled();
    expect(updateSourceCodeFromEntitiesSpy).not.toHaveBeenCalled();
  });

  it('closes the dropdown when ESC is pressed', async () => {
    const { Provider } = TestProvidersWrapper();
    const wrapper = render(
      <Provider>
        <SerializerSelector />
      </Provider>,
    );

    const toggle = wrapper.getByTestId('serializer-list-dropdown');
    act(() => {
      fireEvent.click(toggle);
    });

    const listbox = await wrapper.findByRole('listbox');
    expect(listbox).toBeInTheDocument();

    act(() => {
      fireEvent.focus(listbox);
      fireEvent.keyDown(listbox, { key: 'Escape', code: 'Escape', charCode: 27 });
    });

    await waitFor(() => {
      expect(wrapper.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });
});
