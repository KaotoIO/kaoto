import { render, waitFor } from '@testing-library/react';
import { CamelRouteVisualEntity } from '../../../models/visualization/flows';
import { camelRouteJson } from '../../../stubs/camel-route';
import { Canvas } from './Canvas';

describe('Canvas', () => {
  it('should render correctly', async () => {
    const entity = new CamelRouteVisualEntity(camelRouteJson.route);

    const result = render(<Canvas entities={[entity]} />);

    await waitFor(async () => expect(result.container.querySelector('#fit-to-screen')).toBeInTheDocument());

    expect(result.container).toMatchSnapshot();
  });
});
