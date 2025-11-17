import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { ReturnToSourceCodeFallback } from './ReturnToSourceCodeFallback';

describe('ReturnToSourceCodeFallback', () => {
  it('renders correctly', () => {
    const wrapper = render(
      <MemoryRouter>
        <ReturnToSourceCodeFallback />
      </MemoryRouter>,
    );
    expect(wrapper.asFragment()).toMatchSnapshot();
  });
});
