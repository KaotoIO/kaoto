import { FunctionComponent, MouseEvent, useCallback, useState } from 'react';
import {
  Bullseye,
  Button,
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
import { ArrowRightIcon } from '@patternfly/react-icons';
import { ExpressionItem } from '../../models/mapping';
import { TransformationService } from '../../services/transformation.service';
import { XPathParserService } from '../../services/xpath/xpath-parser.service';
import { FunctionGroup } from '../../services/xpath/xpath-parser';
import { SourcePanel } from '../../layout/views/SourcePanel';
import { NodeContainer } from '../document/NodeContainer';
import { XPathEditor } from './action/XPathEditor';

type TransformationEditorProps = {
  mapping: ExpressionItem;
  onUpdate: () => void;
};

export const TransformationEditor: FunctionComponent<TransformationEditorProps> = ({ mapping, onUpdate }) => {
  const transformation = mapping?.expression;
  const transformationExpression = TransformationService.toExpression(transformation);
  const handleExpressionChange = useCallback(
    (expression?: string) => {
      if (expression) {
        mapping.expression = expression;
        onUpdate();
      }
    },
    [mapping, onUpdate],
  );
  const functionDefinitions = XPathParserService.getXPathFunctionDefinitions();

  const [activeTabKey, setActiveTabKey] = useState<string | number>(0);
  const handleTabClick = (_event: MouseEvent, tabIndex: string | number) => {
    setActiveTabKey(tabIndex);
  };

  return (
    <Grid hasGutter>
      <GridItem key={0} span={3} rowSpan={10}>
        <Tabs isFilled activeKey={activeTabKey} onSelect={handleTabClick}>
          <Tab eventKey={0} key={0} title={<TabTitleText>Function</TabTitleText>}>
            <Menu isScrollable>
              <MenuContent>
                {Object.keys(functionDefinitions).map((value) => (
                  <MenuGroup key={value} label={value}>
                    {functionDefinitions[value as FunctionGroup].map((func, index) => (
                      <NodeContainer key={value + '-' + index} nodeData={undefined} ref={undefined}>
                        <MenuItem key={`${value}-${index}`} description={func.description}>
                          {func.displayName}
                        </MenuItem>
                      </NodeContainer>
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
        <Bullseye>
          <Button variant="control" icon={<ArrowRightIcon />} />
        </Bullseye>
      </GridItem>
      <GridItem key={1} span={6} rowSpan={10}>
        <XPathEditor expression={transformationExpression} onChange={handleExpressionChange} />
      </GridItem>
    </Grid>
  );
};
