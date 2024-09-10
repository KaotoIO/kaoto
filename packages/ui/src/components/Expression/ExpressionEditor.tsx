import { FunctionComponent, MouseEvent, useCallback, useMemo, useState } from 'react';
import {
  //Bullseye,
  //Button,
  Grid,
  GridItem,
  Menu,
  MenuContent,
  MenuGroup,
  MenuItem,
  Tab,
  Tabs,
  TabTitleText,
} from '@patternfly/react-core';
//import { ArrowRightIcon } from '@patternfly/react-icons';
import { ExpressionItem } from '../../models/datamapper/mapping';
import { XPathService } from '../../services/xpath/xpath.service';
import { FunctionGroup } from '../../services/xpath/xpath-parser';
import { SourcePanel } from '../View/SourcePanel';
import { DroppableContainer, DraggableContainer } from '../Document/NodeContainer';
import { XPathEditor } from './XPathEditor';
import { ExpressionEditorDnDHandler } from '../../providers/dnd/ExpressionEditorDnDHandler';
import { EditorNodeData, FunctionNodeData } from '../../models/datamapper';
import { DatamapperDndProvider } from '../../providers/datamapper-dnd.provider';
import { DataMapperDnDMonitor } from '../../providers/dnd/DataMapperDndMonitor';

type TransformationEditorProps = {
  mapping: ExpressionItem;
  onUpdate: () => void;
};

export const ExpressionEditor: FunctionComponent<TransformationEditorProps> = ({ mapping, onUpdate }) => {
  const dndHandler = useMemo(() => new ExpressionEditorDnDHandler(), []);

  const handleExpressionChange = useCallback(
    (expression?: string) => {
      if (expression) {
        mapping.expression = expression;
        onUpdate();
      }
    },
    [mapping, onUpdate],
  );
  const functionDefinitions = XPathService.getXPathFunctionDefinitions();

  const [activeTabKey, setActiveTabKey] = useState<string | number>(0);
  const handleTabClick = (_event: MouseEvent, tabIndex: string | number) => {
    setActiveTabKey(tabIndex);
  };

  return (
    <DatamapperDndProvider handler={dndHandler}>
      <Grid hasGutter>
        <GridItem key={0} span={3} rowSpan={10}>
          <Tabs isFilled activeKey={activeTabKey} onSelect={handleTabClick}>
            <Tab eventKey={0} key={0} title={<TabTitleText>Function</TabTitleText>}>
              <Menu isScrollable>
                <MenuContent>
                  {Object.keys(functionDefinitions).map((value) => (
                    <MenuGroup key={value} label={value}>
                      {functionDefinitions[value as FunctionGroup].map((func, index) => (
                        <DraggableContainer
                          key={index}
                          id={`${value}-${index}-${func.name}`}
                          nodeData={new FunctionNodeData(func)}
                        >
                          <MenuItem key={`${value}-${index}`} description={func.description}>
                            {func.displayName}
                          </MenuItem>
                        </DraggableContainer>
                      ))}
                    </MenuGroup>
                  ))}
                </MenuContent>
              </Menu>
            </Tab>
            <Tab eventKey={1} key={1} title={<TabTitleText>Field</TabTitleText>}>
              <div className="pf-m-scrollable">
                <SourcePanel />
              </div>
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
          <DroppableContainer id="expression-editor" nodeData={new EditorNodeData(mapping)}>
            <XPathEditor mapping={mapping} onChange={handleExpressionChange} />
          </DroppableContainer>
        </GridItem>
      </Grid>
      <DataMapperDnDMonitor />
    </DatamapperDndProvider>
  );
};
