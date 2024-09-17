import { RootNodeMapper } from '../root-node-mapper';
import { MulticastNodeMapper } from './multicast-node-mapper';

describe('MulticastNodeMapper', () => {
  let mapper: MulticastNodeMapper;

  beforeEach(() => {
    const rootNodeMapper = new RootNodeMapper();
    rootNodeMapper.registerDefaultMapper(mapper);

    mapper = new MulticastNodeMapper(rootNodeMapper);
  });

  it('should return "multicast" as the processor name', () => {
    expect(mapper.getProcessorName()).toBe('multicast');
  });
});
