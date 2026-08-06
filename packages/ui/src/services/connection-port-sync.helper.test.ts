import { ConnectionPortSyncHelper } from './connection-port-sync.helper';

describe('ConnectionPortSyncHelper', () => {
  const createMockElement = (
    elemRect: Partial<DOMRect>,
    containers: { panelContent?: Partial<DOMRect>; panels?: Partial<DOMRect> },
  ): HTMLElement => {
    return {
      getBoundingClientRect: () => elemRect as DOMRect,
      closest: (selector: string) => {
        if (selector === '.expansion-panel__content' && containers.panelContent) {
          return { getBoundingClientRect: () => containers.panelContent as DOMRect };
        }
        if (selector === '.expansion-panels' && containers.panels) {
          return { getBoundingClientRect: () => containers.panels as DOMRect };
        }
        return null;
      },
    } as unknown as HTMLElement;
  };

  describe('isVisibleWithinPanelContent', () => {
    it('should return true when no scroll container exists', () => {
      const element = createMockElement({ top: 200, bottom: 230 }, {});
      expect(ConnectionPortSyncHelper.isVisibleWithinPanelContent(element)).toBe(true);
    });

    it('should return true when element is within container bounds', () => {
      const element = createMockElement({ top: 100, bottom: 130 }, { panelContent: { top: 0, bottom: 500 } });
      expect(ConnectionPortSyncHelper.isVisibleWithinPanelContent(element)).toBe(true);
    });

    it('should return false when element is above container', () => {
      const element = createMockElement({ top: -20, bottom: 10 }, { panelContent: { top: 0, bottom: 500 } });
      expect(ConnectionPortSyncHelper.isVisibleWithinPanelContent(element)).toBe(false);
    });

    it('should return false when element is below container', () => {
      const element = createMockElement({ top: 480, bottom: 510 }, { panelContent: { top: 0, bottom: 500 } });
      expect(ConnectionPortSyncHelper.isVisibleWithinPanelContent(element)).toBe(false);
    });

    it('should allow 1px tolerance at top boundary', () => {
      const element = createMockElement({ top: -1, bottom: 30 }, { panelContent: { top: 0, bottom: 500 } });
      expect(ConnectionPortSyncHelper.isVisibleWithinPanelContent(element)).toBe(true);
    });

    it('should allow 1px tolerance at bottom boundary', () => {
      const element = createMockElement({ top: 470, bottom: 501 }, { panelContent: { top: 0, bottom: 500 } });
      expect(ConnectionPortSyncHelper.isVisibleWithinPanelContent(element)).toBe(true);
    });

    it('should return false when element exceeds tolerance at top', () => {
      const element = createMockElement({ top: -2, bottom: 30 }, { panelContent: { top: 0, bottom: 500 } });
      expect(ConnectionPortSyncHelper.isVisibleWithinPanelContent(element)).toBe(false);
    });

    it('should return false when element exceeds tolerance at bottom', () => {
      const element = createMockElement({ top: 470, bottom: 502 }, { panelContent: { top: 0, bottom: 500 } });
      expect(ConnectionPortSyncHelper.isVisibleWithinPanelContent(element)).toBe(false);
    });
  });

  describe('isVisibleWithinPanelsViewport', () => {
    it('should return true when no panels container exists', () => {
      const element = createMockElement({ top: 200, bottom: 230 }, {});
      expect(ConnectionPortSyncHelper.isVisibleWithinPanelsViewport(element)).toBe(true);
    });

    it('should return true when element is within panels bounds', () => {
      const element = createMockElement({ top: 100, bottom: 130 }, { panels: { top: 0, bottom: 500 } });
      expect(ConnectionPortSyncHelper.isVisibleWithinPanelsViewport(element)).toBe(true);
    });

    it('should return false when element is above panels viewport', () => {
      const element = createMockElement({ top: -20, bottom: 10 }, { panels: { top: 0, bottom: 500 } });
      expect(ConnectionPortSyncHelper.isVisibleWithinPanelsViewport(element)).toBe(false);
    });

    it('should return false when element is below panels viewport', () => {
      const element = createMockElement({ top: 480, bottom: 510 }, { panels: { top: 0, bottom: 500 } });
      expect(ConnectionPortSyncHelper.isVisibleWithinPanelsViewport(element)).toBe(false);
    });

    it('should allow 1px tolerance at top boundary', () => {
      const element = createMockElement({ top: -1, bottom: 30 }, { panels: { top: 0, bottom: 500 } });
      expect(ConnectionPortSyncHelper.isVisibleWithinPanelsViewport(element)).toBe(true);
    });

    it('should allow 1px tolerance at bottom boundary', () => {
      const element = createMockElement({ top: 470, bottom: 501 }, { panels: { top: 0, bottom: 500 } });
      expect(ConnectionPortSyncHelper.isVisibleWithinPanelsViewport(element)).toBe(true);
    });

    it('should return false when element exceeds tolerance at top', () => {
      const element = createMockElement({ top: -2, bottom: 30 }, { panels: { top: 0, bottom: 500 } });
      expect(ConnectionPortSyncHelper.isVisibleWithinPanelsViewport(element)).toBe(false);
    });

    it('should return false when element exceeds tolerance at bottom', () => {
      const element = createMockElement({ top: 470, bottom: 502 }, { panels: { top: 0, bottom: 500 } });
      expect(ConnectionPortSyncHelper.isVisibleWithinPanelsViewport(element)).toBe(false);
    });
  });

  describe('isElementVisible', () => {
    it('should return true when element has no panel content ancestor (e.g. in summary)', () => {
      const element = createMockElement({ top: -50, bottom: -20 }, { panels: { top: 0, bottom: 500 } });
      expect(ConnectionPortSyncHelper.isElementVisible(element)).toBe(true);
    });

    it('should return true when element has no panel content and no panels ancestor', () => {
      const element = createMockElement({ top: 200, bottom: 230 }, {});
      expect(ConnectionPortSyncHelper.isElementVisible(element)).toBe(true);
    });

    it('should return true when element is within both containers', () => {
      const element = createMockElement(
        { top: 100, bottom: 130 },
        { panelContent: { top: 0, bottom: 500 }, panels: { top: 0, bottom: 500 } },
      );
      expect(ConnectionPortSyncHelper.isElementVisible(element)).toBe(true);
    });

    it('should return false when element is outside panel content bounds', () => {
      const element = createMockElement(
        { top: -20, bottom: 10 },
        { panelContent: { top: 0, bottom: 500 }, panels: { top: 0, bottom: 500 } },
      );
      expect(ConnectionPortSyncHelper.isElementVisible(element)).toBe(false);
    });

    it('should return false when element is outside panels viewport bounds', () => {
      const element = createMockElement(
        { top: 100, bottom: 130 },
        { panelContent: { top: 0, bottom: 500 }, panels: { top: 200, bottom: 500 } },
      );
      expect(ConnectionPortSyncHelper.isElementVisible(element)).toBe(false);
    });
  });

  describe('getClampedEdgePosition', () => {
    it('should return unclamped center position when no panels container exists', () => {
      const element = createMockElement({ x: 100, y: 200, width: 50, height: 30 }, {});
      expect(ConnectionPortSyncHelper.getClampedEdgePosition(element)).toEqual([125, 215]);
    });

    it('should return unclamped position when Y is within panels bounds', () => {
      const element = createMockElement({ x: 100, y: 200, width: 50, height: 30 }, { panels: { top: 0, bottom: 500 } });
      expect(ConnectionPortSyncHelper.getClampedEdgePosition(element)).toEqual([125, 215]);
    });

    it('should clamp Y to panels top when element is above viewport', () => {
      const element = createMockElement({ x: 100, y: -50, width: 50, height: 30 }, { panels: { top: 0, bottom: 500 } });
      expect(ConnectionPortSyncHelper.getClampedEdgePosition(element)).toEqual([125, 0]);
    });

    it('should clamp Y to panels bottom when element is below viewport', () => {
      const element = createMockElement({ x: 100, y: 600, width: 50, height: 30 }, { panels: { top: 0, bottom: 500 } });
      expect(ConnectionPortSyncHelper.getClampedEdgePosition(element)).toEqual([125, 500]);
    });

    it('should always compute X as horizontal center regardless of clamping', () => {
      const element = createMockElement({ x: 40, y: -100, width: 20, height: 10 }, { panels: { top: 0, bottom: 500 } });
      const [x] = ConnectionPortSyncHelper.getClampedEdgePosition(element);
      expect(x).toBe(50);
    });
  });
});
