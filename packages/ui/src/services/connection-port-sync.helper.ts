/**
 * Pure DOM helpers for connection port visibility and positioning within
 * the {@link ExpansionPanels} scroll hierarchy, consumed by
 * {@link useConnectionPortSync}. Separates the two visibility concerns
 * (inner panel content vs. outer panels viewport) from the EDGE marker
 * clamping logic so each can be reasoned about independently.
 */
export class ConnectionPortSyncHelper {
  private static readonly TOLERANCE = 1;

  /**
   * Determine whether a connection port element is visible inside its nearest
   * `.expansion-panel__content` scroll container (vertical bounds only).
   *
   * Horizontal bounds are intentionally ignored because target connection ports
   * are positioned with a negative `left` value (outside the container's left
   * boundary) via CSS, so checking horizontal bounds would incorrectly exclude
   * all target ports.
   */
  static isVisibleWithinPanelContent(element: HTMLElement): boolean {
    const scrollContainer = element.closest('.expansion-panel__content');
    if (!scrollContainer) return true;

    const elemRect = element.getBoundingClientRect();
    const containerRect = scrollContainer.getBoundingClientRect();

    return (
      elemRect.top >= containerRect.top - this.TOLERANCE && elemRect.bottom <= containerRect.bottom + this.TOLERANCE
    );
  }

  /**
   * Determine whether a connection port element is visible inside the outer
   * `.expansion-panels` viewport (vertical bounds only).
   */
  static isVisibleWithinPanelsViewport(element: HTMLElement): boolean {
    const panelsContainer = element.closest('.expansion-panels');
    if (!panelsContainer) return true;

    const elemRect = element.getBoundingClientRect();
    const panelsRect = panelsContainer.getBoundingClientRect();

    return elemRect.top >= panelsRect.top - this.TOLERANCE && elemRect.bottom <= panelsRect.bottom + this.TOLERANCE;
  }

  /**
   * Elements without a `.expansion-panel__content` ancestor (e.g. primitive
   * document header ports in `.expansion-panel__summary`) are always visible.
   */
  static isElementVisible(element: HTMLElement): boolean {
    if (!element.closest('.expansion-panel__content')) return true;
    return this.isVisibleWithinPanelContent(element) && this.isVisibleWithinPanelsViewport(element);
  }

  /**
   * Calculate the rendered position for an EDGE marker, clamping its Y coordinate
   * to the visible `.expansion-panels` bounds so that anchors stay pinned to the
   * nearest visible edge of the panels container.
   */
  static getClampedEdgePosition(element: HTMLElement): [number, number] {
    const rect = element.getBoundingClientRect();
    const x = rect.x + rect.width / 2;
    let y = rect.y + rect.height / 2;

    const panelsContainer = element.closest('.expansion-panels');
    if (panelsContainer) {
      const panelsRect = panelsContainer.getBoundingClientRect();
      y = Math.max(panelsRect.top, Math.min(panelsRect.bottom, y));
    }

    return [x, y];
  }
}
