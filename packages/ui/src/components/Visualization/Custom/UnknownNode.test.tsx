import { render } from '@testing-library/react';
import { UnknownNode } from './UnknownNode';

describe('UnknownNode', () => {
  it('renders UnknownNode component', () => {
    const wrapper = render(<UnknownNode model={{}} />);
    expect(wrapper.asFragment()).toMatchSnapshot();
  });

  it('renders UnknownNode component with a model', () => {
    const wrapper = render(<UnknownNode model={{ prop1: 'value 1', prop2: 'value 2' }} />);
    expect(wrapper.asFragment()).toMatchSnapshot();
  });
});
