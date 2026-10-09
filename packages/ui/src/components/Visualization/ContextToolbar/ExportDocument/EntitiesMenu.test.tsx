import { fireEvent, render, screen } from '@testing-library/react';

import { DocumentationEntity } from '../../../../models/documentation';
import { BaseEntity } from '../../../../models/entities';
import { EntitiesMenu } from './EntitiesMenu';

it.each(['route', 'all'])('toggles %s visibility without mutating the supplied entities', (target) => {
  const entity = Object.freeze(new DocumentationEntity({ label: 'route', entity: { id: 'route' } as BaseEntity }));
  const entities = [entity];
  Object.freeze(entities);
  const onUpdate = vi.fn();
  render(<EntitiesMenu documentationEntities={entities} onUpdate={onUpdate} />);

  fireEvent.click(screen.getByTestId('entities-list-btn'));
  fireEvent.click(screen.getByTestId(`toggle-btn-${target}-hide`));

  expect(onUpdate).toHaveBeenCalledWith([expect.objectContaining({ label: 'route', isVisible: false })]);
  expect(entity.isVisible).toBe(true);
});
