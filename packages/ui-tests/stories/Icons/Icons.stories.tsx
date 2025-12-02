import './Icons.stories.scss';

import {
  CatalogKind,
  CatalogLoaderProvider,
  CatalogSchemaLoader,
  IconResolver,
  RuntimeProvider,
  SchemasLoaderProvider,
} from '@kaoto/kaoto/testing';
import { Meta, StoryFn } from '@storybook/react';

export default {
  title: 'Icons',
  component: IconResolver,
} as Meta<typeof IconResolver>;

const IconTableTemplate: StoryFn<typeof IconResolver> = () => {
  return (
    <RuntimeProvider catalogUrl={CatalogSchemaLoader.DEFAULT_CATALOG_PATH}>
      <SchemasLoaderProvider>
        <CatalogLoaderProvider>
          <table className="icons-table" aria-hidden>
            <thead>
              <th>Log component</th>
              <th>Log EIP</th>
              <th>Log-action Kamelet</th>
              <th>Placeholder</th>
              <th>Unknown</th>
              <th>Default</th>
            </thead>

            <tbody>
              <tr>
                <td>
                  {/* @ts-expect-error Cannot access ambient const enums when 'isolatedModules' is enabled */}
                  <IconResolver catalogKind={CatalogKind.Component} name="log" className="icon-gallery-item" />
                </td>
                <td>
                  {/* @ts-expect-error Cannot access ambient const enums when 'isolatedModules' is enabled */}
                  <IconResolver catalogKind={CatalogKind.Processor} name="log" className="icon-gallery-item" />
                </td>
                <td>
                  {/* @ts-expect-error Cannot access ambient const enums when 'isolatedModules' is enabled */}
                  <IconResolver catalogKind={CatalogKind.Kamelet} name="log-action" className="icon-gallery-item" />
                </td>
                <td>
                  {/* @ts-expect-error Cannot access ambient const enums when 'isolatedModules' is enabled */}
                  <IconResolver catalogKind={CatalogKind.Entity} name="placeholder" className="icon-gallery-item" />
                </td>
                <td>
                  {/* @ts-expect-error Cannot access ambient const enums when 'isolatedModules' is enabled */}
                  <IconResolver catalogKind={CatalogKind.Entity} name={undefined} className="icon-gallery-item" />
                </td>
                <td>
                  {/* @ts-expect-error Cannot access ambient const enums when 'isolatedModules' is enabled */}
                  <IconResolver catalogKind={CatalogKind.Component} name="non-existing" className="icon-gallery-item" />
                </td>
              </tr>
            </tbody>
          </table>
        </CatalogLoaderProvider>
      </SchemasLoaderProvider>
    </RuntimeProvider>
  );
};
export const IconTable = IconTableTemplate.bind({});
