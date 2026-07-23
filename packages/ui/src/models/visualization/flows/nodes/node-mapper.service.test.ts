import { DATAMAPPER_ID_PREFIX } from '../../../../utils';
import { BaseNodeMapper } from './mappers/base-node-mapper';
import { ChoiceNodeMapper } from './mappers/choice-node-mapper';
import { CircuitBreakerNodeMapper } from './mappers/circuit-breaker-node-mapper';
import { DataMapperNodeMapper } from './mappers/datamapper-node-mapper';
import { FromNodeMapper } from './mappers/from-node-mapper';
import { LoadBalanceNodeMapper } from './mappers/loadbalance-node-mapper';
import { MulticastNodeMapper } from './mappers/multicast-node-mapper';
import { OnFallbackNodeMapper } from './mappers/on-fallback-node-mapper';
import { OtherwiseNodeMapper } from './mappers/otherwise-node-mapper';
import { RouteConfigurationNodeMapper } from './mappers/route-configuration-node-mapper';
import { StepNodeMapper } from './mappers/step-node-mapper';
import { WhenNodeMapper } from './mappers/when-node-mapper';
import { NodeMapperService } from './node-mapper.service';
import { RootNodeMapper } from './root-node-mapper';

describe('NodeMapperService', () => {
  it('should initialize the root node mapper', async () => {
    const registerDefaultMapperSpy = vi.spyOn(RootNodeMapper.prototype, 'registerDefaultMapper');
    const registerMapperSpy = vi.spyOn(RootNodeMapper.prototype, 'registerMapper');

    await NodeMapperService.getVizNode('path', { processorName: 'log' }, {});

    expect(registerDefaultMapperSpy).toHaveBeenCalledWith(expect.any(BaseNodeMapper));
    expect(registerMapperSpy).toHaveBeenCalledWith('from', expect.any(FromNodeMapper));
    expect(registerMapperSpy).toHaveBeenCalledWith('circuitBreaker', expect.any(CircuitBreakerNodeMapper));
    expect(registerMapperSpy).toHaveBeenCalledWith('onFallback', expect.any(OnFallbackNodeMapper));
    expect(registerMapperSpy).toHaveBeenCalledWith('choice', expect.any(ChoiceNodeMapper));
    expect(registerMapperSpy).toHaveBeenCalledWith('when', expect.any(WhenNodeMapper));
    expect(registerMapperSpy).toHaveBeenCalledWith('otherwise', expect.any(OtherwiseNodeMapper));
    expect(registerMapperSpy).toHaveBeenCalledWith('step', expect.any(StepNodeMapper));
    expect(registerMapperSpy).toHaveBeenCalledWith(DATAMAPPER_ID_PREFIX, expect.any(DataMapperNodeMapper));
    expect(registerMapperSpy).toHaveBeenCalledWith('multicast', expect.any(MulticastNodeMapper));
    expect(registerMapperSpy).toHaveBeenCalledWith('loadBalance', expect.any(LoadBalanceNodeMapper));
    expect(registerMapperSpy).toHaveBeenCalledWith('routeConfiguration', expect.any(RouteConfigurationNodeMapper));
  });
});
