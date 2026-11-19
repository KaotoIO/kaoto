import { fireEvent, render, screen } from '@testing-library/react';
import { ComponentProps } from 'react';

import { CatalogLayout } from './Catalog.models';
import { CatalogFilter } from './CatalogFilter';

describe('CatalogFilter', () => {
  const renderFilter = (props: Partial<ComponentProps<typeof CatalogFilter>> = {}) =>
    render(
      <CatalogFilter
        searchTerm=""
        groups={[
          { name: 'component', count: 2 },
          { name: 'processor', count: 1 },
        ]}
        providers={['Apache Camel']}
        selectedProviders={['Apache Camel']}
        tags={['database', 'cloud', 'messaging']}
        tagsOverflowIndex={3}
        layouts={[CatalogLayout.Gallery, CatalogLayout.List]}
        activeGroups={['component', 'processor']}
        activeLayout={CatalogLayout.Gallery}
        filterTags={[]}
        onChange={vi.fn()}
        setActiveGroups={vi.fn()}
        setActiveLayout={vi.fn()}
        setFilterTags={vi.fn()}
        onSelectProvider={vi.fn()}
        {...props}
      />,
    );

  describe('tags', () => {
    it('adds a clicked tag to the filter tags', () => {
      const setFilterTags = vi.fn();
      renderFilter({ filterTags: ['database'], setFilterTags });

      fireEvent.click(screen.getByText('cloud'));

      expect(setFilterTags).toHaveBeenCalledWith(['database', 'cloud']);
    });

    it('removes a clicked tag that is already in the filter tags', () => {
      const setFilterTags = vi.fn();
      renderFilter({ filterTags: ['database', 'cloud'], setFilterTags });

      fireEvent.click(screen.getByText('cloud'));

      expect(setFilterTags).toHaveBeenCalledWith(['database']);
    });

    it('does not offer to clear the filter tags when none are selected', () => {
      renderFilter({ filterTags: [] });

      expect(screen.queryByText('Clear')).not.toBeInTheDocument();
    });

    it('clears all filter tags with the "Clear" label', () => {
      const setFilterTags = vi.fn();
      renderFilter({ filterTags: ['database', 'cloud'], setFilterTags });

      fireEvent.click(screen.getByText('Clear'));

      expect(setFilterTags).toHaveBeenCalledWith([]);
    });

    it.each([
      [[], ['database'], '2 more'],
      [['database'], ['Clear', 'database'], '2 more'],
    ])('with the filter tags %j shows %j before the overflow label', (filterTags, visibleLabels, overflowLabel) => {
      renderFilter({ filterTags, tagsOverflowIndex: 1 });

      visibleLabels.forEach((label) => {
        expect(screen.getByText(label)).toBeInTheDocument();
      });
      expect(screen.queryByText('cloud')).not.toBeInTheDocument();
      expect(screen.getByText(overflowLabel)).toBeInTheDocument();
    });
  });

  describe('type', () => {
    it('removes a selected type from the active groups when it is clicked', () => {
      const setActiveGroups = vi.fn();
      renderFilter({ activeGroups: ['component', 'processor'], setActiveGroups });

      fireEvent.click(screen.getByRole('button', { name: /Processor/ }));

      expect(setActiveGroups).toHaveBeenCalledWith(['component']);
    });

    it('adds an unselected type to the active groups when it is clicked', () => {
      const setActiveGroups = vi.fn();
      renderFilter({ activeGroups: ['component'], setActiveGroups });

      fireEvent.click(screen.getByRole('button', { name: /Processor/ }));

      expect(setActiveGroups).toHaveBeenCalledWith(['component', 'processor']);
    });
  });

  describe('layout', () => {
    it('passes the clicked layout to setActiveLayout', () => {
      const setActiveLayout = vi.fn();
      renderFilter({ activeLayout: CatalogLayout.Gallery, setActiveLayout });

      fireEvent.click(screen.getByRole('button', { name: `toggle-layout-button-${CatalogLayout.List}` }));

      expect(setActiveLayout).toHaveBeenCalledWith(CatalogLayout.List);
    });
  });
});
