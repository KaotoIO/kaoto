import {
  Grid,
  GridItem,
  Menu,
  MenuContent,
  MenuGroup,
  MenuItem,
  SearchInput,
  Tab,
  TabContent,
  Tabs,
  TabTitleText,
} from '@patternfly/react-core';
import { FunctionComponent, MouseEvent, useCallback, useMemo, useRef, useState } from 'react';
import { EditorNodeData, FunctionNodeData } from '../../models/datamapper';
import { ExpressionItem } from '../../models/datamapper/mapping';
import { DatamapperDndProvider } from '../../providers/datamapper-dnd.provider';
import { DataMapperDnDMonitor } from '../../providers/dnd/DataMapperDndMonitor';
import { ExpressionEditorDnDHandler } from '../../providers/dnd/ExpressionEditorDnDHandler';
import { FunctionGroup } from '../../services/xpath/xpath-parser';
import { XPathService } from '../../services/xpath/xpath.service';
import { DraggableContainer, DroppableContainer } from '../Document/NodeContainer';
import { SourcePanel } from '../View/SourcePanel';
import { XPathEditor } from './XPathEditor';
import './XPathEditorLayout.scss';

type XPathEditorLayoutProps = {
  mapping: ExpressionItem;
  onUpdate: () => void;
};

export const XPathEditorLayout: FunctionComponent<XPathEditorLayoutProps> = ({ mapping, onUpdate }) => {
  const dndHandler = useMemo(() => new ExpressionEditorDnDHandler(), []);

  const handleExpressionChange = useCallback(
    (expression?: string) => {
      mapping.expression = expression ?? '';
      onUpdate();
    },
    [mapping, onUpdate],
  );
  const functionDefinitions = XPathService.getXPathFunctionDefinitions();

  const [activeTabKey, setActiveTabKey] = useState<string | number>(0);
  const handleTabClick = (_event: MouseEvent, tabIndex: string | number) => {
    setActiveTabKey(tabIndex);
  };
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchValue, setSearchValue] = useState('');
  const focusOnSearchInput = useCallback(() => {
    searchInputRef.current?.focus();
  }, []);
  const handleOnSearchChange = useCallback((_event: unknown, value: string) => {
    setSearchValue(value);
  }, []);

  const getSearchValue = searchValue.toLowerCase();

  return (
    <DatamapperDndProvider handler={dndHandler}>
      <Grid hasGutter className="xpath-editor-layout-grid">
        <GridItem key={0} span={4} rowSpan={10}>
          <Tabs isFilled activeKey={activeTabKey} onSelect={handleTabClick}>
            <Tab
              eventKey={0}
              key={0}
              title={<TabTitleText>Field</TabTitleText>}
              className="xpath-editor-layout-tab-content"
            >
              <TabContent id="fields" className="xpath-editor-layout-tab-content">
                <SourcePanel isReadOnly={true} />
              </TabContent>
            </Tab>
            <Tab
              eventKey={1}
              key={1}
              title={<TabTitleText>Function</TabTitleText>}
              className="xpath-editor-layout-tab-content"
            >
              <TabContent id="functions" className="xpath-editor-layout-tab-content">
                <Menu isScrollable className="xpath-editor-layout-tab-content">
                  <MenuContent menuHeight="100%" maxMenuHeight="100%">
                    <MenuItem data-testid="functions-menu-search-item" onFocus={focusOnSearchInput}>
                      <SearchInput
                        data-testid="functions-menu-search-input"
                        ref={searchInputRef}
                        placeholder="Filter functions..."
                        value={searchValue}
                        onChange={handleOnSearchChange}
                      />
                    </MenuItem>

                    {Object.keys(functionDefinitions).map((value) => (
                      <MenuGroup
                        key={value}
                        label={value}
                        hidden={
                          !functionDefinitions[value as FunctionGroup].some((func) =>
                            func.displayName.toLocaleLowerCase().includes(getSearchValue),
                          )
                        }
                      >
                        {functionDefinitions[value as FunctionGroup]
                          .filter((func) => func.displayName.toLocaleLowerCase().includes(getSearchValue))
                          .map((func) => (
                            <DraggableContainer
                              key={`${value}-${func.name}`}
                              id={`${value}-${func.name}`}
                              nodeData={new FunctionNodeData(func)}
                            >
                              <MenuItem
                                className="menu-item-drag"
                                key={`${value}-${func.name}`}
                                description={func.description}
                              >
                                {func.displayName}
                              </MenuItem>
                            </DraggableContainer>
                          ))}
                      </MenuGroup>
                    ))}
                  </MenuContent>
                </Menu>
              </TabContent>
            </Tab>
          </Tabs>
        </GridItem>
        <GridItem key={2} span={1} rowSpan={10}>
          {/* TODO: non-DnD operation as an alternative
          <Bullseye>
            <Button variant="control" icon={<ArrowRightIcon />} />
          </Bullseye>
          */}
        </GridItem>
        <GridItem key={1} span={6} rowSpan={10}>
          <DroppableContainer
            id="xpath-editor"
            className="xpath-editor-layout-tab-content"
            nodeData={new EditorNodeData(mapping)}
          >
            <XPathEditor mapping={mapping} onChange={handleExpressionChange} />
          </DroppableContainer>
        </GridItem>
      </Grid>
      <DataMapperDnDMonitor />
    </DatamapperDndProvider>
  );
};
