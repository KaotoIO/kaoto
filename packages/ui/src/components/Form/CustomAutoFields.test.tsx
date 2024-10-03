import { act, render } from '@testing-library/react';
import { KaotoSchemaDefinition } from '../../models';
import { CanvasFormTabsProvider } from '../../providers';
import { UniformsWrapper } from '../../stubs/TestUniformsWrapper';
import { TimerComponentSchema } from '../../stubs/timer.component.schema';
import { CustomAutoFields } from './CustomAutoFields';

describe('CustomAutoFields', () => {
  it('renders `AutoFields` for common fields', () => {
    let wrapper: ReturnType<typeof render> | undefined;

    act(() => {
      wrapper = render(
        <CanvasFormTabsProvider>
          <UniformsWrapper model={{}} schema={TimerComponentSchema as KaotoSchemaDefinition['schema']}>
            <CustomAutoFields />
          </UniformsWrapper>
        </CanvasFormTabsProvider>,
      );
    });

    expect(wrapper?.asFragment()).toMatchSnapshot();
  });

  it('render `NoFieldFound` when there are no fields', () => {
    let wrapper: ReturnType<typeof render> | undefined;

    act(() => {
      wrapper = render(
        <CanvasFormTabsProvider>
          <UniformsWrapper model={{}} schema={{ type: 'object' } as KaotoSchemaDefinition['schema']}>
            <CustomAutoFields />
          </UniformsWrapper>
        </CanvasFormTabsProvider>,
      );
    });

    expect(wrapper?.asFragment()).toMatchSnapshot();
  });
});
