import { render, waitFor } from '@testing-library/react';
import { CamelRouteVisualEntity } from '../../../models/visualization/flows';
import { camelRouteJson } from '../../../stubs/camel-route';
import { Canvas } from './Canvas';
import { EntitiesContext } from '../../../providers/entities.provider';
import { EntitiesContextResult } from '../../../hooks';

describe('Canvas', () => {
  it('should render correctly', async () => {
    const entity = new CamelRouteVisualEntity(camelRouteJson.route);

    const result = render(
      <EntitiesContext.Provider value={{ visibleFlows: { ['route-8888']: true } } as unknown as EntitiesContextResult}>
        <Canvas entities={[entity]} />
      </EntitiesContext.Provider>,
    );

    await waitFor(async () => expect(result.container.querySelector('#fit-to-screen')).toBeInTheDocument());

    expect(result.container).toMatchSnapshot();
  });
});
