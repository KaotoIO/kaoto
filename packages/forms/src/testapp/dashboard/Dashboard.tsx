import { Tile } from '@carbon/react';
import { Cube } from '@carbon/icons-react';
import { FunctionComponent } from 'react';
import { KaotoForm } from '../../form';
import { Preview } from '../preview/Preview';
import { useCurrentSchema } from '../providers/CurrentSchemaProvider';
import { useModel } from '../providers/ModelProvider';
import { SchemaSelector } from '../schema-selector/SchemaSelector';
import { TabSelector } from '../tab-selector/TabSelector';
import './Dashboard.scss';

export const Dashboard: FunctionComponent = () => {
  const { schema } = useCurrentSchema();
  const { model = {}, setModel } = useModel();

  return (
    <div className="dashboard">
      <div className="dashboard__left">
        <Preview preview={schema?.value} />

        <Preview preview={model} />
      </div>

      <section className="dashboard__divider" />

      <div className="dashboard__right">
        <TabSelector />

        {!schema?.value ? (
          <Tile className="dashboard__empty-state">
            <div className="dashboard__empty-state-content">
              <Cube size={48} className="dashboard__empty-state-icon" />
              <h4>No schema selected</h4>
              <p>Select a schema to start</p>
              <SchemaSelector />
            </div>
          </Tile>
        ) : (
          <KaotoForm schema={schema.value} model={model} onChange={setModel} />
        )}
      </div>
    </div>
  );
};
