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

  it('should render the "oneOf" selector when needed', () => {
    const mockSchema: KaotoSchemaDefinition['schema'] = {
      title: 'Test',
      type: 'object',
      additionalProperties: false,
      properties: {
        id: {
          title: 'ID',
          type: 'string',
        },
      },
      oneOf: [
        {
          title: 'One',
          type: 'object',
          properties: {
            timerName: {
              title: 'Timer Name',
              description: 'The name of the timer',
              type: 'string',
            },
          },
        },
        {
          title: 'Two',
          type: 'object',
          properties: {
            pattern: {
              title: 'Pattern',
              description:
                'Allows you to specify a custom Date pattern to use for setting the time option using URI syntax.',
              type: 'string',
            },
          },
        },
      ],
    };

    const wrapper = render(
      <CanvasFormTabsProvider>
        <UniformsWrapper model={{}} schema={mockSchema}>
          <CustomAutoFields />
        </UniformsWrapper>
      </CanvasFormTabsProvider>,
    );

    const oneOfToggle = wrapper.queryByTestId('-oneof-toggle');
    expect(oneOfToggle).toBeInTheDocument();
  });
});
