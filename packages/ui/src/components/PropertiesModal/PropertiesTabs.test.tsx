import { render, screen } from '@testing-library/react';

import { IPropertiesTable, PropertiesHeaders, PropertiesTableType } from './PropertiesModal.models';
import { groupTables, PropertiesTabs } from './PropertiesTabs';

describe('PropertiesTabs', () => {
  const headers = [PropertiesHeaders.Name, PropertiesHeaders.Description];
  const row = (name: string) => ({ name, description: name + ' description', type: 'string', rowAdditionalInfo: {} });

  const simpleTable = (caption: string, tableHeaders = headers): IPropertiesTable => ({
    type: PropertiesTableType.Simple,
    headers: tableHeaders,
    rows: [row(caption + '-row')],
    caption,
  });

  const treeTable: IPropertiesTable = {
    type: PropertiesTableType.Tree,
    headers,
    rows: [row('tree-row')],
    caption: 'tree',
  };

  describe('groupTables', () => {
    it('groups consecutive simple tables with identical headers', () => {
      const groups = groupTables([simpleTable('path'), simpleTable('query')]);

      expect(groups).toHaveLength(1);
      expect(groups[0].startIndex).toBe(0);
      expect(groups[0].tables.map((table) => table.caption)).toEqual(['path', 'query']);
    });

    it('keeps simple tables with different headers apart', () => {
      const groups = groupTables([simpleTable('a'), simpleTable('b', [PropertiesHeaders.Name])]);

      expect(groups.map((group) => group.startIndex)).toEqual([0, 1]);
    });

    it('never groups tree tables', () => {
      const groups = groupTables([simpleTable('a'), treeTable, simpleTable('b')]);

      expect(groups.map((group) => group.startIndex)).toEqual([0, 1, 2]);
      expect(groups[1].tables).toEqual([treeTable]);
    });
  });

  it('renders grouped simple tables as one table and a following tree table separately', () => {
    const tables = [simpleTable('path'), simpleTable('query'), treeTable];
    const { container } = render(<PropertiesTabs tab={{ rootName: 'tab', tables }} tab_index={0} />);

    expect(container.querySelectorAll('table')).toHaveLength(2);
    const sharedTable = screen.getByTestId('tab-0-table-0');
    expect(sharedTable.tagName).toBe('TABLE');
    expect(screen.queryByTestId('tab-0-table-1')).not.toBeInTheDocument();
    expect(sharedTable).toContainElement(screen.getByTestId('tab-0-table-1-properties-modal-table-caption'));
    expect(screen.getByTestId('tab-0-table-2-properties-modal-table-caption')).toHaveTextContent('tree');
  });
});
