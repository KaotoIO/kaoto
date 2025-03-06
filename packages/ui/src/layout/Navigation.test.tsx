import { render } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import { SourceSchemaType } from '../models/camel';
import { EntitiesContext, EntitiesContextResult } from '../providers';
import { Navigation } from './Navigation';

describe('Navigation Component', () => {
  it.each([
    SourceSchemaType.Route,
    SourceSchemaType.Kamelet,
    SourceSchemaType.Pipe,
    SourceSchemaType.KameletBinding,
    SourceSchemaType.Integration,
  ])('navigation sidebar for: %s', (currentSchemaType) => {
    const wrapper = render(
      <Router>
        <EntitiesContext.Provider value={{ currentSchemaType } as EntitiesContextResult}>
          <Navigation isNavOpen />
        </EntitiesContext.Provider>
      </Router>,
    );

    expect(wrapper.asFragment()).toMatchSnapshot();
  });
});
