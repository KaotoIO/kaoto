import { NodeData } from '../../../../models/datamapper/visualization';
import { MenuContributor } from './types';

export function useAbstractFieldMenu(_nodeData: NodeData): MenuContributor {
  return {
    groups: [],
    modals: null,
  };
}

// Made with Bob
