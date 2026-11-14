import { render } from '@testing-library/react';

import { RenderingAnchorContext } from '../RenderingAnchor/rendering.provider';
import {
  componentModeRegistration,
  dataMapperLauncherRegistration,
  groupAutoStartupRegistration,
  RegisterComponents,
} from './RegisterComponents';

describe('RegisterComponents', () => {
  const renderWithRegisterSpy = (ui: React.ReactElement) => {
    const registerComponent = vi.fn();
    render(
      <RenderingAnchorContext.Provider value={{ registerComponent, getRegisteredComponents: () => [] }}>
        {ui}
      </RenderingAnchorContext.Provider>,
    );
    return registerComponent;
  };

  it('registers the DataMapper launcher, the component mode selector and the auto startup switch by default', () => {
    const registerComponent = renderWithRegisterSpy(<RegisterComponents />);

    expect(registerComponent.mock.calls).toEqual([
      [dataMapperLauncherRegistration],
      [componentModeRegistration],
      [groupAutoStartupRegistration],
    ]);
  });

  it('registers only the given components', () => {
    const registerComponent = renderWithRegisterSpy(
      <RegisterComponents components={[componentModeRegistration, groupAutoStartupRegistration]} />,
    );

    expect(registerComponent.mock.calls).toEqual([[componentModeRegistration], [groupAutoStartupRegistration]]);
  });
});
