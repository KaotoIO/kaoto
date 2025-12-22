import { applyConstrainedResize, calculateConstrainedDelta, getEffectiveMinHeight } from './expansion-utils';
import { PanelData } from './ExpansionContext';

describe('expansion-utils', () => {
  describe('getEffectiveMinHeight', () => {
    it('should return minHeight when panel is expanded', () => {
      const panel: PanelData = {
        id: 'test-panel',
        height: 300,
        minHeight: 100,
        collapsedHeight: 50,
        element: document.createElement('div'),
        isExpanded: true,
        order: 1,
      };

      const result = getEffectiveMinHeight(panel, 50);

      expect(result).toBe(100); // Returns minHeight
    });

    it('should return collapsedHeight when panel is collapsed', () => {
      const panel: PanelData = {
        id: 'test-panel',
        height: 50,
        minHeight: 100,
        collapsedHeight: 50,
        element: document.createElement('div'),
        isExpanded: false,
        order: 1,
      };

      const result = getEffectiveMinHeight(panel, 50);

      expect(result).toBe(50); // Returns collapsedHeight parameter
    });

    it('should use provided collapsedHeight parameter', () => {
      const panel: PanelData = {
        id: 'test-panel',
        height: 50,
        minHeight: 100,
        collapsedHeight: 50,
        element: document.createElement('div'),
        isExpanded: false,
        order: 1,
      };

      const result = getEffectiveMinHeight(panel, 75); // Different collapsed height

      expect(result).toBe(75); // Uses the parameter, not panel.collapsedHeight
    });
  });

  describe('calculateConstrainedDelta', () => {
    it('should return positive delta when within maxGrow limit', () => {
      const delta = 100; // Want to grow by 100px
      const maxGrow = 200; // Can grow up to 200px
      const maxShrink = 150;

      const result = calculateConstrainedDelta(delta, maxGrow, maxShrink);

      expect(result).toBe(100); // Full delta allowed
    });

    it('should constrain positive delta to maxGrow', () => {
      const delta = 300; // Want to grow by 300px
      const maxGrow = 200; // Can only grow 200px
      const maxShrink = 150;

      const result = calculateConstrainedDelta(delta, maxGrow, maxShrink);

      expect(result).toBe(200); // Constrained to maxGrow
    });

    it('should return negative delta when within maxShrink limit', () => {
      const delta = -100; // Want to shrink by 100px
      const maxGrow = 200;
      const maxShrink = 150; // Can shrink up to 150px

      const result = calculateConstrainedDelta(delta, maxGrow, maxShrink);

      expect(result).toBe(-100); // Full delta allowed
    });

    it('should constrain negative delta to maxShrink', () => {
      const delta = -300; // Want to shrink by 300px
      const maxGrow = 200;
      const maxShrink = 150; // Can only shrink 150px

      const result = calculateConstrainedDelta(delta, maxGrow, maxShrink);

      expect(result).toBe(-150); // Constrained to -maxShrink
    });

    it('should handle zero delta', () => {
      const delta = 0;
      const maxGrow = 200;
      const maxShrink = 150;

      const result = calculateConstrainedDelta(delta, maxGrow, maxShrink);

      expect(result).toBe(0);
    });

    it('should handle zero maxGrow (adjacent panel at minimum)', () => {
      const delta = 100; // Want to grow
      const maxGrow = 0; // Adjacent panel is at minimum
      const maxShrink = 150;

      const result = calculateConstrainedDelta(delta, maxGrow, maxShrink);

      expect(result).toBe(0); // Cannot grow
    });

    it('should handle zero maxShrink (current panel at minimum)', () => {
      const delta = -100; // Want to shrink
      const maxGrow = 200;
      const maxShrink = 0; // Current panel is at minimum

      const result = calculateConstrainedDelta(delta, maxGrow, maxShrink);

      // Use Math.abs to handle -0 vs 0 difference
      expect(Math.abs(result)).toBe(0); // Cannot shrink
    });
  });

  describe('applyConstrainedResize', () => {
    it('should grow current panel and shrink adjacent panel (positive delta)', () => {
      const currentPanel: PanelData = {
        id: 'current',
        height: 300,
        minHeight: 100,
        collapsedHeight: 50,
        element: document.createElement('div'),
        isExpanded: true,
        order: 1,
      };

      const adjacentPanel: PanelData = {
        id: 'adjacent',
        height: 300,
        minHeight: 100,
        collapsedHeight: 50,
        element: document.createElement('div'),
        isExpanded: true,
        order: 2,
      };

      applyConstrainedResize(currentPanel, adjacentPanel, 400, 50); // Grow current to 400px

      expect(currentPanel.height).toBe(400); // Grew by 100
      expect(adjacentPanel.height).toBe(200); // Shrunk by 100
      expect(currentPanel.height + adjacentPanel.height).toBe(600); // Total unchanged
    });

    it('should shrink current panel and grow adjacent panel (negative delta)', () => {
      const currentPanel: PanelData = {
        id: 'current',
        height: 300,
        minHeight: 100,
        collapsedHeight: 50,
        element: document.createElement('div'),
        isExpanded: true,
        order: 1,
      };

      const adjacentPanel: PanelData = {
        id: 'adjacent',
        height: 300,
        minHeight: 100,
        collapsedHeight: 50,
        element: document.createElement('div'),
        isExpanded: true,
        order: 2,
      };

      applyConstrainedResize(currentPanel, adjacentPanel, 200, 50); // Shrink current to 200px

      expect(currentPanel.height).toBe(200); // Shrunk by 100
      expect(adjacentPanel.height).toBe(400); // Grew by 100
      expect(currentPanel.height + adjacentPanel.height).toBe(600); // Total unchanged
    });

    it('should constrain growth when adjacent panel reaches minHeight', () => {
      const currentPanel: PanelData = {
        id: 'current',
        height: 300,
        minHeight: 100,
        collapsedHeight: 50,
        element: document.createElement('div'),
        isExpanded: true,
        order: 1,
      };

      const adjacentPanel: PanelData = {
        id: 'adjacent',
        height: 300,
        minHeight: 100,
        collapsedHeight: 50,
        element: document.createElement('div'),
        isExpanded: true,
        order: 2,
      };

      applyConstrainedResize(currentPanel, adjacentPanel, 600, 50); // Try to grow to 600px

      // Adjacent can only give up 200px (300 - 100 minHeight)
      expect(currentPanel.height).toBe(500); // Grew by 200 (constrained)
      expect(adjacentPanel.height).toBe(100); // At minHeight
    });

    it('should constrain shrinkage when current panel reaches minHeight', () => {
      const currentPanel: PanelData = {
        id: 'current',
        height: 300,
        minHeight: 100,
        collapsedHeight: 50,
        element: document.createElement('div'),
        isExpanded: true,
        order: 1,
      };

      const adjacentPanel: PanelData = {
        id: 'adjacent',
        height: 300,
        minHeight: 100,
        collapsedHeight: 50,
        element: document.createElement('div'),
        isExpanded: true,
        order: 2,
      };

      applyConstrainedResize(currentPanel, adjacentPanel, 50, 50); // Try to shrink to 50px

      // Current can only shrink 200px (300 - 100 minHeight)
      expect(currentPanel.height).toBe(100); // At minHeight
      expect(adjacentPanel.height).toBe(500); // Grew by 200 (constrained)
    });

    it('should respect collapsed height for collapsed adjacent panel', () => {
      const currentPanel: PanelData = {
        id: 'current',
        height: 300,
        minHeight: 100,
        collapsedHeight: 50,
        element: document.createElement('div'),
        isExpanded: true,
        order: 1,
      };

      const adjacentPanel: PanelData = {
        id: 'adjacent',
        height: 50, // Already at collapsed height
        minHeight: 100,
        collapsedHeight: 50,
        element: document.createElement('div'),
        isExpanded: false, // Collapsed
        order: 2,
      };

      applyConstrainedResize(currentPanel, adjacentPanel, 400, 50); // Try to grow

      // Adjacent is collapsed at 50px, cannot give any space
      expect(currentPanel.height).toBe(300); // No change
      expect(adjacentPanel.height).toBe(50); // Stays at collapsed height
    });

    it('should handle exact target height (no constraints hit)', () => {
      const currentPanel: PanelData = {
        id: 'current',
        height: 300,
        minHeight: 100,
        collapsedHeight: 50,
        element: document.createElement('div'),
        isExpanded: true,
        order: 1,
      };

      const adjacentPanel: PanelData = {
        id: 'adjacent',
        height: 300,
        minHeight: 100,
        collapsedHeight: 50,
        element: document.createElement('div'),
        isExpanded: true,
        order: 2,
      };

      applyConstrainedResize(currentPanel, adjacentPanel, 300, 50); // No change requested

      expect(currentPanel.height).toBe(300); // No change
      expect(adjacentPanel.height).toBe(300); // No change
    });

    it('should use provided collapsedHeight parameter for calculations', () => {
      const currentPanel: PanelData = {
        id: 'current',
        height: 300,
        minHeight: 100,
        collapsedHeight: 50,
        element: document.createElement('div'),
        isExpanded: true,
        order: 1,
      };

      const adjacentPanel: PanelData = {
        id: 'adjacent',
        height: 75, // At custom collapsed height
        minHeight: 100,
        collapsedHeight: 50, // Stored value
        element: document.createElement('div'),
        isExpanded: false,
        order: 2,
      };

      applyConstrainedResize(currentPanel, adjacentPanel, 400, 75); // Use 75 as collapsed height

      // Adjacent is at 75px (effective min), cannot give space
      expect(currentPanel.height).toBe(300); // No change
      expect(adjacentPanel.height).toBe(75); // Stays at effective min
    });
  });
});
