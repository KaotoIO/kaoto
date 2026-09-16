import { render } from '@testing-library/react';
import { useContext } from 'react';

import { IVisualizationNode } from '../../models/visualization/base-visual-entity';
import { createVisualizationNode } from '../../models/visualization/visualization-node';
import { RenderingAnchorContext, RenderingProvider } from './rendering.provider';
import { IRegisteredComponent } from './rendering.provider.model';

describe('RenderingProvider', () => {
  const anchorExample = 'form-header';
  const vizNode: IVisualizationNode = createVisualizationNode('example-node', {
    name: 'to',
    isPlaceholder: false,
    isGroup: false,
    iconUrl: '',
    title: '',
    description: '',
  });

  describe('RenderingAnchorContext', () => {
    it('should provide a default implementation', () => {
      expect(() => {
        render(<ProviderConsumer anchorTag={anchorExample} registerComponents={[]} />);
      }).not.toThrow();
    });
  });

  it('should render the child component', () => {
    const { getByText } = render(
      <RenderingProvider>
        <p>Child component</p>
      </RenderingProvider>,
    );

    expect(getByText('Child component')).toBeInTheDocument();
  });

  it('should allow consumers to register and render components', () => {
    const { getByText } = render(
      <RenderingProvider>
        <ProviderConsumer
          anchorTag={anchorExample}
          registerComponents={[
            {
              anchor: anchorExample,
              activationFn: () => true,
              component: () => <p>Registered component</p>,
            },
          ]}
        />
      </RenderingProvider>,
    );

    expect(getByText('Registered component')).toBeInTheDocument();
  });

  it('should filter components by anchorTag', async () => {
    const { getByText, queryByText } = render(
      <RenderingProvider>
        <ProviderConsumer
          anchorTag={anchorExample}
          registerComponents={[
            {
              anchor: anchorExample,
              activationFn: () => true,
              component: () => <p>Registered component</p>,
            },
            {
              anchor: 'another-anchor',
              activationFn: () => true,
              component: () => <p>Another component</p>,
            },
          ]}
        />
      </RenderingProvider>,
    );

    expect(getByText('Registered component')).toBeInTheDocument();

    const anotherComponent = queryByText('Another component');
    expect(anotherComponent).toBeNull();
  });

  it('should render each registration once after repeated renders', () => {
    const activationFn = () => true;
    const components: IRegisteredComponent[] = [
      { anchor: anchorExample, activationFn, component: () => <p>First component</p> },
      { anchor: anchorExample, activationFn, component: () => <p>Second component</p> },
    ];
    const content = () => (
      <RenderingProvider>
        <ProviderConsumer
          anchorTag={anchorExample}
          registerComponents={components.map((component) => ({ ...component }))}
        />
      </RenderingProvider>
    );
    const wrapper = render(content());

    wrapper.rerender(content());
    wrapper.rerender(content());

    expect(wrapper.getAllByText('First component')).toHaveLength(1);
    expect(wrapper.getAllByText('Second component')).toHaveLength(1);
  });

  it('should filter components by activationFn', async () => {
    const { getByText, queryByText } = render(
      <RenderingProvider>
        <ProviderConsumer
          anchorTag={anchorExample}
          registerComponents={[
            {
              anchor: anchorExample,
              activationFn: () => true,
              component: () => <p>Registered component</p>,
            },
            {
              anchor: anchorExample,
              activationFn: () => false,
              component: () => <p>Another component</p>,
            },
          ]}
        />
      </RenderingProvider>,
    );

    expect(getByText('Registered component')).toBeInTheDocument();

    const anotherComponent = queryByText('Another component');
    expect(anotherComponent).toBeNull();
  });

  const ProviderConsumer = (props: { anchorTag: string; registerComponents: IRegisteredComponent[] }) => {
    const { registerComponent, getRegisteredComponents } = useContext(RenderingAnchorContext);

    props.registerComponents.forEach((regComponent) => {
      registerComponent(regComponent);
    });

    const components = getRegisteredComponents('form-header', vizNode);

    return (
      <div>
        {components.map(({ key, Component }) => (
          <Component key={key} vizNode={vizNode} />
        ))}
      </div>
    );
  };
});
