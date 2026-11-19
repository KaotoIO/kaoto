import { RouteTemplateBeansEntity } from './routeTemplateBeansEntity';

describe('RouteTemplateBeansEntity', () => {
  it('should return the beans of the route template as JSON', () => {
    const beans = [{ name: 'myBean', type: 'io.kaoto.MyBean' }];
    const entity = new RouteTemplateBeansEntity({ beans });

    const json = entity.toJSON();

    expect(json).toEqual({ beans: [{ name: 'myBean', type: 'io.kaoto.MyBean' }] });
  });
});
