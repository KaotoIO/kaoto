import { render } from '@testing-library/react';
import { inspect } from 'node:util';
import { CanvasFormTabsContext } from '../../../../../providers';
import { ROOT_PATH } from '../../../../../utils';
import { FormComponentFactoryContext, FormComponentFactoryProvider } from '../providers/FormComponentFactoryProvider';
import { ModelContextProvider } from '../providers/ModelProvider';
import { SchemaProvider } from '../providers/SchemaProvider';
import { AutoField } from './AutoField';

describe('AutoField', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should throw an error if schema is not defined', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<AutoField propName={ROOT_PATH} />)).toThrow(
      `AutoField: schema is not defined for ${ROOT_PATH}`,
    );
  });

  it('should throw an error if formComponentFactory is not defined', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() =>
      render(
        <SchemaProvider schema={{ type: 'string' }}>
          <AutoField propName={ROOT_PATH} />{' '}
        </SchemaProvider>,
      ),
    ).toThrow(`AutoField: formComponentFactory is not defined for ${ROOT_PATH}`);
  });

  it('it should not render when in `Required` mode but no required properties', () => {
    const wrapper = render(
      <CanvasFormTabsContext.Provider
        value={{
          selectedTab: 'Required',
          onTabChange: jest.fn(),
        }}
      >
        <FormComponentFactoryProvider>
          <SchemaProvider schema={{ type: 'object', properties: { name: { type: 'string' } } }}>
            <AutoField propName={ROOT_PATH} />
          </SchemaProvider>
        </FormComponentFactoryProvider>
      </CanvasFormTabsContext.Provider>,
    );

    expect(wrapper.container).toMatchSnapshot();
  });

  it('it should render required fields when in `Required` mode', () => {
    const wrapper = render(
      <CanvasFormTabsContext.Provider
        value={{
          selectedTab: 'Required',
          onTabChange: jest.fn(),
        }}
      >
        <FormComponentFactoryProvider>
          <SchemaProvider
            schema={{
              type: 'object',
              properties: { name: { type: 'string' }, lastName: { type: 'string' } },
              required: ['name'],
            }}
          >
            <AutoField propName={ROOT_PATH} />
          </SchemaProvider>
        </FormComponentFactoryProvider>
      </CanvasFormTabsContext.Provider>,
    );

    const inputFields = wrapper.queryAllByRole('textbox');

    expect(inputFields).toHaveLength(1);
  });

  it('it should not render when in `Modified` mode with no modified properties', () => {
    const wrapper = render(
      <CanvasFormTabsContext.Provider
        value={{
          selectedTab: 'Modified',
          onTabChange: jest.fn(),
        }}
      >
        <ModelContextProvider model={{}} onPropertyChange={jest.fn()}>
          <FormComponentFactoryProvider>
            <SchemaProvider schema={{ type: 'object', properties: { name: { type: 'string' } } }}>
              <AutoField propName={ROOT_PATH} />
            </SchemaProvider>
          </FormComponentFactoryProvider>
        </ModelContextProvider>
      </CanvasFormTabsContext.Provider>,
    );

    expect(wrapper.container).toMatchSnapshot();
  });

  it('it should render when in `Modified` mode, properties with value', () => {
    const wrapper = render(
      <CanvasFormTabsContext.Provider
        value={{
          selectedTab: 'Modified',
          onTabChange: jest.fn(),
        }}
      >
        <FormComponentFactoryProvider>
          <ModelContextProvider model={{ name: 'test' }} onPropertyChange={jest.fn()}>
            <SchemaProvider
              schema={{
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  lastName: { type: 'string' },
                },
              }}
            >
              <AutoField propName={ROOT_PATH} />
            </SchemaProvider>
          </ModelContextProvider>
        </FormComponentFactoryProvider>
      </CanvasFormTabsContext.Provider>,
    );

    const inputFields = wrapper.queryAllByRole('textbox');

    expect(inputFields).toHaveLength(1);
  });

  it('should get the component to render from the fromComponentFactory callback', () => {
    const factorySpy = jest.fn().mockReturnValue(() => <input name="name" />);

    render(
      <FormComponentFactoryContext.Provider value={factorySpy}>
        <ModelContextProvider model="test" onPropertyChange={jest.fn()}>
          <SchemaProvider schema={{ type: 'string' }}>
            <AutoField propName={ROOT_PATH} />
          </SchemaProvider>
        </ModelContextProvider>
      </FormComponentFactoryContext.Provider>,
    );

    expect(factorySpy).toHaveBeenCalledWith({ type: 'string' });
  });

  it('should provide properties to the rendered field', () => {
    const factorySpy = jest.fn().mockReturnValue((props: Record<string, string>) => <pre>{inspect(props)}</pre>);

    const wrapper = render(
      <FormComponentFactoryContext.Provider value={factorySpy}>
        <ModelContextProvider model="test" onPropertyChange={jest.fn()}>
          <SchemaProvider schema={{ type: 'string' }}>
            <AutoField propName={ROOT_PATH} />
          </SchemaProvider>
        </ModelContextProvider>
      </FormComponentFactoryContext.Provider>,
    );

    expect(wrapper.asFragment()).toMatchSnapshot();
  });
});
