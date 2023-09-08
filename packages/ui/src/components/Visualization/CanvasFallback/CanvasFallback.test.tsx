import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CanvasFallback } from './CanvasFallback';

describe('CanvasFallback', () => {
  it('renders correctly', () => {
    const wrapper = render(
      <MemoryRouter>
        <CanvasFallback />
      </MemoryRouter>,
    );
    expect(wrapper.asFragment()).toMatchSnapshot();
  });
});
