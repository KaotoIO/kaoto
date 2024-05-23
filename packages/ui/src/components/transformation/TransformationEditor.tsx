import { FunctionComponent, useCallback, useMemo } from 'react';
import { Accordion, Card, CardBody, CardHeader } from '@patternfly/react-core';
import { useDataMapper } from '../../hooks';
import { ITransformationItem } from '../../models';
import { ItemHelper } from './item/item-helper';
import { HeaderActionList } from './action/headerActionList';

export const TransformationEditor: FunctionComponent = () => {
  const { selectedMapping, setSelectedMapping } = useDataMapper();
  const transformation = selectedMapping?.source;

  const handleUpdate = useCallback(() => setSelectedMapping(selectedMapping), [selectedMapping, setSelectedMapping]);

  const createTreeItem = useCallback(
    (element: ITransformationItem) => ItemHelper.createTransformationItem(element, handleUpdate),
    [handleUpdate],
  );

  const handleOnToggle = useCallback(() => {}, []);

  const headerActions = useMemo(() => {
    return <HeaderActionList transformation={transformation} onUpdate={handleUpdate} />;
  }, [handleUpdate, transformation]);

  return (
    selectedMapping && (
      <Card>
        <CardHeader actions={{ actions: headerActions }}></CardHeader>
        <CardBody>
          <Accordion isBordered={true} asDefinitionList={false} onClick={handleOnToggle} togglePosition="start">
            {transformation?.elements.map((element) => createTreeItem(element))}
          </Accordion>
        </CardBody>
      </Card>
    )
  );
};
