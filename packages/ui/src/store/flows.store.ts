import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';
import { FlowModel } from '../models';

interface FlowsState {
  flows: FlowModel[];
  addFlow: (flow: FlowModel) => void;
}

export const useFlowsStore = createWithEqualityFn<FlowsState>(
  (set) => ({
    flows: [],
    addFlow: (flow: FlowModel) => {
      set((state) => ({
        flows: [...state.flows, flow],
      }));
    },
  }),
  shallow,
);
