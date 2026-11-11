import { render } from '@testing-library/react';

import { ModelContextProvider, SchemaProvider } from '../../providers';
import { IndexedValuesField } from './IndexedValuesField';

describe('IndexedValuesField', () => {
  const PROP_NAME = 'constructors';

  const renderField = ({
    model = {},
    schema = { title: 'test constructors', type: 'object' },
  }: {
    model?: Record<string, unknown>;
    schema?: Record<string, unknown>;
  } = {}) =>
    render(
      <ModelContextProvider model={model} onPropertyChange={vi.fn()}>
        <SchemaProvider schema={schema}>
          <IndexedValuesField propName={PROP_NAME} />
        </SchemaProvider>
      </ModelContextProvider>,
    );

  it('should render the capitalized schema title and the values count', () => {
    const { container } = renderField({ model: { [PROP_NAME]: { '0': 'value0', '1': 'value1' } } });

    expect(container.querySelector('label')).toHaveTextContent('Test constructors 2');
  });

  it('should render the values count as an inline element', () => {
    const { container } = renderField();

    expect(container.querySelector('label div')).not.toBeInTheDocument();
    expect(container.querySelector('p div')).not.toBeInTheDocument();
  });
});
