import { BaseNodeMapper } from './mappers/base-node-mapper';
import { ChoiceNodeMapper } from './mappers/choice-node-mapper';
import { OtherwiseNodeMapper } from './mappers/otherwise-node-mapper';
import { WhenNodeMapper } from './mappers/when-node-mapper';
import { NodeMapperService } from './node-mapper.service';
import { RootNodeMapper } from './root-node-mapper';

describe('NodeMapperService', () => {
  it('should initialize the root node mapper', () => {
    const registerDefaultMapperSpy = jest.spyOn(RootNodeMapper.prototype, 'registerDefaultMapper');
    const registerMapperSpy = jest.spyOn(RootNodeMapper.prototype, 'registerMapper');

    NodeMapperService.getVizNode('path', { processorName: 'log' }, {});

    expect(registerDefaultMapperSpy).toHaveBeenCalledWith(expect.any(BaseNodeMapper));
    expect(registerMapperSpy).toHaveBeenCalledWith('choice', expect.any(ChoiceNodeMapper));
    expect(registerMapperSpy).toHaveBeenCalledWith('when', expect.any(WhenNodeMapper));
    expect(registerMapperSpy).toHaveBeenCalledWith('otherwise', expect.any(OtherwiseNodeMapper));
  });
});
