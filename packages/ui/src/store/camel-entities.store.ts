import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';
import { BaseCamelEntity } from '../camel-entities';

interface CamelEntitiesState {
  entities: BaseCamelEntity[];
  addEntity: (entity: BaseCamelEntity) => void;
}

export const useCamelEntitiesStore = createWithEqualityFn<CamelEntitiesState>(
  (set) => ({
    entities: [],
    addEntity: (entity: BaseCamelEntity) => {
      set((state) => ({
        entities: [...state.entities, entity],
      }));
    },
  }),
  shallow,
);
