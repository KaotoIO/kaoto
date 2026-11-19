import { render, screen } from '@testing-library/react';
import { JSONSchema4 } from 'json-schema';
import { PropsWithChildren } from 'react';

import { CanvasFormTabsContext, CanvasFormTabsContextResult } from '../../providers/canvas-form-tabs.provider';
import { FormComponentFactoryProvider } from '../../providers/FormComponentFactoryProvider';
import { ModelContextProvider } from '../../providers/ModelProvider';
import { ROOT_PATH } from '../../utils';
import { GroupFields } from './GroupFields';

const groups: [string, Record<string, JSONSchema4>][] = [
  ['security', { username: { type: 'string', title: 'Username' } }],
  ['advanced', { timeout: { type: 'number', title: 'Timeout' }, headers: { type: 'object', title: 'Headers' } }],
];

const renderGroups = (
  selectedTab: CanvasFormTabsContextResult['selectedTab'],
  model: unknown,
  requiredProperties: string[] = [],
) => {
  const wrapper = ({ children }: PropsWithChildren) => (
    <CanvasFormTabsContext.Provider value={{ selectedTab, setSelectedTab: vi.fn() }}>
      <FormComponentFactoryProvider>
        <ModelContextProvider model={model} onPropertyChange={vi.fn()}>
          {children}
        </ModelContextProvider>
      </FormComponentFactoryProvider>
    </CanvasFormTabsContext.Provider>
  );
  render(<GroupFields propName={ROOT_PATH} groups={groups} requiredProperties={requiredProperties} />, { wrapper });

  return {
    security: screen.queryByTestId('#-Security'),
    advanced: screen.queryByTestId('#-Advanced'),
  };
};

describe('GroupFields', () => {
  it('shows every group under its capitalized name in the All tab', () => {
    const { security, advanced } = renderGroups('All', undefined);

    expect(security).toBeInTheDocument();
    expect(advanced).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
  });

  describe('Required tab', () => {
    it('shows only the groups with a required property', () => {
      const { security, advanced } = renderGroups('Required', undefined, ['username']);

      expect(security).toBeInTheDocument();
      expect(advanced).not.toBeInTheDocument();
    });

    it('also shows a group whose object property has a value', () => {
      const { security, advanced } = renderGroups('Required', { headers: { foo: 'bar' } }, ['username']);

      expect(security).toBeInTheDocument();
      expect(advanced).toBeInTheDocument();
    });

    it('hides a group whose only value is in a plain property', () => {
      const { advanced } = renderGroups('Required', { timeout: 10 });

      expect(advanced).not.toBeInTheDocument();
    });
  });

  describe('Modified tab', () => {
    it('shows only the groups with a value', () => {
      const { security, advanced } = renderGroups('Modified', { timeout: 10 });

      expect(security).not.toBeInTheDocument();
      expect(advanced).toBeInTheDocument();
    });

    it('hides every group without a model', () => {
      const { security, advanced } = renderGroups('Modified', undefined);

      expect(security).not.toBeInTheDocument();
      expect(advanced).not.toBeInTheDocument();
    });
  });
});
