import { act, render, screen } from '@testing-library/react';
import { inspect } from 'node:util';
import { CanvasFormTabsContext, CanvasFormTabsContextResult } from '../providers';
import { FormComponentFactoryContext } from '../providers/context/form-component-factory-context';
import { FormComponentFactoryProvider } from '../providers/FormComponentFactoryProvider';
import { ModelContextProvider } from '../providers/ModelProvider';
import { SchemaProvider } from '../providers/SchemaProvider';
import { ROOT_PATH } from '../utils';
import { AutoField } from './AutoField';

describe('AutoField', () => {
  let requiredValue: CanvasFormTabsContextResult;
  let modifiedValue: CanvasFormTabsContextResult;

  beforeEach(() => {
    requiredValue = { selectedTab: 'Required', setSelectedTab: jest.fn() };
    modifiedValue = { selectedTab: 'Modified', setSelectedTab: jest.fn() };
  });

  it('should throw an error if schema is not defined', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<AutoField propName={ROOT_PATH} />)).toThrow(
      `AutoField: schema is not defined for ${ROOT_PATH}`,
    );

    jest.restoreAllMocks();
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

    jest.restoreAllMocks();
  });

  it('it should not render when in `Required` mode but no required properties', () => {
    const wrapper = render(
      <CanvasFormTabsContext.Provider value={requiredValue}>
        <FormComponentFactoryProvider>
          <SchemaProvider schema={{ type: 'object', properties: { name: { type: 'string' } } }}>
            <AutoField propName={ROOT_PATH} />
          </SchemaProvider>
        </FormComponentFactoryProvider>
      </CanvasFormTabsContext.Provider>,
    );

    expect(wrapper.container).toMatchSnapshot();
  });

  describe('Required mode', () => {
    it('it should render required fields', () => {
      const wrapper = render(
        <CanvasFormTabsContext.Provider value={requiredValue}>
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

    it('it should render nested required fields from non-required but defined object parent', () => {
      const wrapper = render(
        <CanvasFormTabsContext.Provider value={requiredValue}>
          <FormComponentFactoryProvider>
            <SchemaProvider
              schema={{
                type: 'object',
                properties: { options: { type: 'object', properties: { key: { type: 'string' } }, required: ['key'] } },
              }}
            >
              <ModelContextProvider model={{ options: { key: 'MainKey' } }} onPropertyChange={jest.fn()}>
                <AutoField propName={ROOT_PATH} />
              </ModelContextProvider>
            </SchemaProvider>
          </FormComponentFactoryProvider>
        </CanvasFormTabsContext.Provider>,
      );

      const inputFields = wrapper.queryAllByRole('textbox');

      expect(inputFields).toHaveLength(1);
    });

    it('it should render nested required fields from non-required but defined array parent', async () => {
      await act(async () => {
        render(
          <CanvasFormTabsContext.Provider value={requiredValue}>
            <FormComponentFactoryProvider>
              <SchemaProvider
                schema={{
                  type: 'object',
                  properties: {
                    keys: {
                      type: 'array',
                      items: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
                    },
                  },
                }}
              >
                <ModelContextProvider model={{ keys: [{ name: 'MainKey' }] }} onPropertyChange={jest.fn()}>
                  <AutoField propName={ROOT_PATH} />
                </ModelContextProvider>
              </SchemaProvider>
            </FormComponentFactoryProvider>
          </CanvasFormTabsContext.Provider>,
        );
      });

      const inputFields = await screen.findAllByRole('textbox');
      expect(inputFields).toHaveLength(1);
    });

    it('it should render nested required fields from oneOf', () => {
      const wrapper = render(
        <CanvasFormTabsContext.Provider value={requiredValue}>
          <FormComponentFactoryProvider>
            <SchemaProvider
              schema={{
                oneOf: [
                  {
                    type: 'object',
                    properties: {
                      options: { type: 'object', properties: { key: { type: 'string' } }, required: ['key'] },
                    },
                  },
                ],
              }}
            >
              <ModelContextProvider model={{ options: { key: 'MainKey' } }} onPropertyChange={jest.fn()}>
                <AutoField propName={ROOT_PATH} />
              </ModelContextProvider>
            </SchemaProvider>
          </FormComponentFactoryProvider>
        </CanvasFormTabsContext.Provider>,
      );

      const inputFields = wrapper.queryAllByRole('textbox');

      expect(inputFields).toHaveLength(1);
    });

    it('it should render nested required fields from anyOf', () => {
      const wrapper = render(
        <CanvasFormTabsContext.Provider value={requiredValue}>
          <FormComponentFactoryProvider>
            <SchemaProvider
              schema={{
                type: 'object',
                anyOf: [
                  {
                    type: 'object',
                    properties: {
                      options: { type: 'object', properties: { lastname: { type: 'string' } }, required: ['lastname'] },
                    },
                  },
                ],
                properties: { name: { type: 'string' } },
              }}
            >
              <ModelContextProvider model={{ options: { lastname: 'Smith' } }} onPropertyChange={jest.fn()}>
                <AutoField propName={ROOT_PATH} />
              </ModelContextProvider>
            </SchemaProvider>
          </FormComponentFactoryProvider>
        </CanvasFormTabsContext.Provider>,
      );

      const inputFields = wrapper.queryAllByRole('textbox');
      expect(inputFields).toHaveLength(1);
      expect(inputFields[0]).toHaveValue('Smith');
    });

    it('it should not render object with undefined properties', () => {
      const wrapper = render(
        <CanvasFormTabsContext.Provider value={requiredValue}>
          <FormComponentFactoryProvider>
            <SchemaProvider
              schema={{
                type: 'object',
                title: 'labels',
              }}
            >
              <AutoField propName={ROOT_PATH} required={false} />
            </SchemaProvider>
          </FormComponentFactoryProvider>
        </CanvasFormTabsContext.Provider>,
      );

      expect(wrapper.container).toMatchSnapshot();
    });
  });

  it('it should not render when in `Modified` mode with no modified properties', () => {
    const wrapper = render(
      <CanvasFormTabsContext.Provider value={modifiedValue}>
        <FormComponentFactoryProvider>
          <SchemaProvider schema={{ type: 'object', properties: { name: { type: 'string' } } }}>
            <ModelContextProvider model={{}} onPropertyChange={jest.fn()}>
              <AutoField propName={ROOT_PATH} />
            </ModelContextProvider>
          </SchemaProvider>
        </FormComponentFactoryProvider>
      </CanvasFormTabsContext.Provider>,
    );

    expect(wrapper.container).toMatchSnapshot();
  });

  it('it should not render object with undefined properties in `Modified` mode with no modified properties', () => {
    const wrapper = render(
      <CanvasFormTabsContext.Provider value={modifiedValue}>
        <FormComponentFactoryProvider>
          <SchemaProvider schema={{ type: 'object', title: 'labels' }}>
            <ModelContextProvider model={{}} onPropertyChange={jest.fn()}>
              <AutoField propName={ROOT_PATH} />
            </ModelContextProvider>
          </SchemaProvider>
        </FormComponentFactoryProvider>
      </CanvasFormTabsContext.Provider>,
    );

    expect(wrapper.container).toMatchSnapshot();
  });

  it('it should render when in `Modified` mode, properties with value', () => {
    const wrapper = render(
      <CanvasFormTabsContext.Provider value={modifiedValue}>
        <FormComponentFactoryProvider>
          <SchemaProvider
            schema={{
              type: 'object',
              properties: {
                name: { type: 'string' },
                lastName: { type: 'string' },
              },
            }}
          >
            <ModelContextProvider model={{ name: 'test' }} onPropertyChange={jest.fn()}>
              <AutoField propName={ROOT_PATH} />
            </ModelContextProvider>
          </SchemaProvider>
        </FormComponentFactoryProvider>
      </CanvasFormTabsContext.Provider>,
    );

    const inputFields = wrapper.queryAllByRole('textbox');

    expect(inputFields).toHaveLength(1);
  });

  it('it should render when in `Modified` mode, properties with value which matches the default value', () => {
    const wrapper = render(
      <CanvasFormTabsContext.Provider value={modifiedValue}>
        <FormComponentFactoryProvider>
          <SchemaProvider
            schema={{
              type: 'object',
              properties: {
                name: { type: 'string', default: 'test' },
                disabled: { type: 'boolean', default: true, title: 'Disabled' },
              },
            }}
          >
            <ModelContextProvider model={{ name: 'test', disabled: true }} onPropertyChange={jest.fn()}>
              <AutoField propName={ROOT_PATH} />
            </ModelContextProvider>
          </SchemaProvider>
        </FormComponentFactoryProvider>
      </CanvasFormTabsContext.Provider>,
    );

    const nameFields = wrapper.queryAllByRole('textbox');
    expect(nameFields).toHaveLength(1);

    const disabledFields = wrapper.queryAllByRole('switch');
    expect(disabledFields).toHaveLength(1);
  });

  it('should get the component to render from the fromComponentFactory callback', () => {
    const factorySpy = jest.fn().mockReturnValue(() => <input aria-label="test" name="name" />);

    render(
      <FormComponentFactoryContext.Provider value={factorySpy}>
        <SchemaProvider schema={{ type: 'string' }}>
          <ModelContextProvider model="test" onPropertyChange={jest.fn()}>
            <AutoField propName={ROOT_PATH} />
          </ModelContextProvider>
        </SchemaProvider>
      </FormComponentFactoryContext.Provider>,
    );

    expect(factorySpy).toHaveBeenCalledWith({ type: 'string' });
  });

  it('should provide properties to the rendered field', () => {
    const factorySpy = jest.fn().mockReturnValue((props: Record<string, string>) => <pre>{inspect(props)}</pre>);

    const wrapper = render(
      <FormComponentFactoryContext.Provider value={factorySpy}>
        <SchemaProvider schema={{ type: 'string' }}>
          <ModelContextProvider model="test" onPropertyChange={jest.fn()}>
            <AutoField propName={ROOT_PATH} />
          </ModelContextProvider>
        </SchemaProvider>
      </FormComponentFactoryContext.Provider>,
    );

    expect(wrapper.asFragment()).toMatchSnapshot();
  });
});
