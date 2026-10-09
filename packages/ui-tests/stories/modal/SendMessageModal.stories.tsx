import { Button } from '@carbon/react';
import {
  CatalogLoaderProvider,
  CatalogSchemaLoader,
  KaotoResourceProvider,
  RuntimeProvider,
  SchemasLoaderProvider,
  SendMessageModal,
  SendMessageModalProvider,
  SourceCodeSync,
  useSendMessageModal,
} from '@kaoto/kaoto/testing';
import { Meta, StoryFn } from '@storybook/react';
import { FunctionComponent } from 'react';

export default {
  title: 'Modal/SendMessageModal',
  component: SendMessageModal,
  decorators: [
    (Story: StoryFn) => (
      <SourceCodeSync initialSourceCode="">
        <KaotoResourceProvider>
          <RuntimeProvider
            catalogUrl={CatalogSchemaLoader.DEFAULT_CATALOG_PATH}
            runtimeCatalogName=""
            testingCatalogName=""
          >
            <SchemasLoaderProvider>
              <CatalogLoaderProvider>
                <SendMessageModalProvider>
                  <Story />
                </SendMessageModalProvider>
              </CatalogLoaderProvider>
            </SchemasLoaderProvider>
          </RuntimeProvider>
        </KaotoResourceProvider>
      </SourceCodeSync>
    ),
  ],
} as Meta<typeof SendMessageModal>;

const SendMessageTrigger: FunctionComponent = () => {
  const { openSendMessageModal } = useSendMessageModal()!;

  return (
    <div style={{ padding: '2rem' }}>
      <h3>Send Message Modal Demo</h3>
      <p style={{ color: '#525252', marginBottom: '1.5rem' }}>
        Uses the complete Camel Catalog with deduplicated headers with simple value types from all components.
      </p>
      <Button
        onClick={() => {
          openSendMessageModal({
            endpoint: 'direct:orders',
            title: 'Send a test message to orders',
            subtitle: 'It goes to the endpoint the route starts from, in the running app.',
            initialBody: '{\n  "orderId": "12345",\n  "item": "Widget",\n  "amount": 99.95\n}',
            initialHeaders: [
              { key: 'Content-Type', value: 'application/json' },
              { key: 'fail', value: 'false' },
            ],
            onSend: async (payload) => {
              await new Promise((resolve) => setTimeout(resolve, 1000));
              alert(`Message sent: ${JSON.stringify(payload, null, 2)}`);
            },
          });
        }}
      >
        Open Send Message Modal
      </Button>
      <SendMessageModal />
    </div>
  );
};

export const Default: StoryFn<typeof SendMessageModal> = () => {
  return <SendMessageTrigger />;
};
