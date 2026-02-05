import './XPathEditorLayout.scss';

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
import { FunctionComponent, MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { EditorNodeData, FunctionNodeData } from '../../models/datamapper';
import { ExpressionItem } from '../../models/datamapper/mapping';
import { DatamapperDndProvider } from '../../providers/datamapper-dnd.provider';
import { DataMapperDnDMonitor } from '../../providers/dnd/DataMapperDndMonitor';
import { ExpressionEditorDnDHandler } from '../../providers/dnd/ExpressionEditorDnDHandler';
import { XPathService } from '../../services/xpath/xpath.service';
import { FunctionGroup } from '../../services/xpath/xpath-model';
import { DraggableContainer, DroppableContainer } from '../Document/NodeContainer';
import { SourcePanel } from '../View/SourcePanel';
import { XPathEditor } from './XPathEditor';

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

  const handleOnSearchChange = useCallback((_event: unknown, value: string) => {
    setSearchValue(value);
  }, []);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, [activeTabKey]);

  const getSearchValue = searchValue.toLowerCase();

  return (
    <DatamapperDndProvider handler={dndHandler}>
      <Grid hasGutter className="xpath-editor">
        <GridItem key={0} span={4} rowSpan={10}>
          <Tabs isFilled mountOnEnter unmountOnExit activeKey={activeTabKey} onSelect={handleTabClick}>
            <Tab
              id="fields"
              eventKey={0}
              key={0}
              title={<TabTitleText>Field</TabTitleText>}
              className="xpath-editor--full-height"
              data-testid="xpath-editor-tab-field"
            >
              <TabContent id="fields" className="xpath-editor--full-height xpath-editor__tab">
                <SourcePanel isReadOnly={true} onZoomIn={() => {}} onZoomOut={() => {}} />
              </TabContent>
            </Tab>

            <Tab
              id="functions"
              eventKey={1}
              key={1}
              title={<TabTitleText>Function</TabTitleText>}
              className="xpath-editor--full-height"
              data-testid="xpath-editor-tab-function"
            >
              <TabContent id="functions" className="xpath-editor--full-height xpath-editor__tab">
                <SearchInput
                  data-testid="functions-menu-search-input"
                  ref={searchInputRef}
                  placeholder="Filter functions..."
                  value={searchValue}
                  onChange={handleOnSearchChange}
                />
                <Menu className="xpath-editor__tab__functions-list">
                  <MenuContent>
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
            className="xpath-editor--full-height"
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
