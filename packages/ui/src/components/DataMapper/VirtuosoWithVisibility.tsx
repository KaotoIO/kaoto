import { FunctionComponent, useContext, useEffect } from 'react';
import { Virtuoso, VirtuosoProps } from 'react-virtuoso';

import { updateVisiblePortPositions } from '../../utils/update-visible-port-positions';
import { ExpansionPanelContentContext } from '../ExpansionPanels/ExpansionPanelContentContext';

/**
 * Wrapper around Virtuoso that automatically tracks connection port visibility
 * using IntersectionObserver. Only ports visible within the scroll viewport
 * are registered, filtering out overscan elements.
 *
 * Uses ExpansionPanelContentContext to get the actual clipping boundary (the
 * expansion-panel__content element) rather than Virtuoso's internal scroller.
 * This ensures IntersectionObserver fires when elements cross the visual boundary.
 *
 * Combines two strategies:
 * 1. IntersectionObserver - tracks WHICH ports are visible (enter/leave viewport)
 * 2. Scroll event - updates POSITIONS of visible ports during scroll
 *
 * Note: This component provides its own onScroll handler and does not forward
 * the onScroll prop from parent. Use onLayoutChange in parent components instead.
 */
export const VirtuosoWithVisibility: FunctionComponent<Omit<VirtuosoProps<unknown, unknown>, 'onScroll'>> = (props) => {
  // Get the ExpansionPanel's content ref from context (the actual scroll/clip container)
  const scrollContainerRef = useContext(ExpansionPanelContentContext);

  // Listen to scroll events on the actual scroll container
  // When using customScrollParent, Virtuoso's onScroll doesn't fire
  useEffect(() => {
    const scrollContainer = scrollContainerRef?.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      updateVisiblePortPositions();
    };

    // Add scroll listener to the expansion panel content element
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });

    // Initial update
    updateVisiblePortPositions();

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [scrollContainerRef]);

  // Tell Virtuoso to use the ExpansionPanel's content element as the scroll container
  // instead of creating its own internal scroller.
  return (
    <Virtuoso {...props} customScrollParent={scrollContainerRef?.current ?? undefined} style={{ height: '100%' }} />
  );
};
