import { CatalogKind } from '@kaoto/editor-api';

import icon_citrus_logo from '../../../../../../assets/citrus-logo.png';
import icon_component_aws2_s3 from '../../../../../../assets/components/aws2-s3.svg';
import icon_component_generic from '../../../../../../assets/components/generic-component.png';
import icon_component_kafka from '../../../../../../assets/components/kafka.svg';
import icon_eip_choice from '../../../../../../assets/eip/choice.png';
import icon_eip_transform from '../../../../../../assets/eip/transform.png';
import expandIcon from '../../../../../../assets/expand.svg';
import questionIcon from '../../../../../../assets/question-mark.svg';
import { NodeIconResolver } from './node-icon-resolver';

describe('NodeIconResolver', () => {
  it('should return the unknown icon when no element name is provided', async () => {
    await expect(NodeIconResolver.getIcon(undefined, CatalogKind.Component)).resolves.toBe(questionIcon);
  });

  describe('components', () => {
    it.each([
      ['kafka', icon_component_kafka],
      ['aws2-s3', icon_component_aws2_s3],
      ['marshal', icon_eip_transform],
      ['zookeeper', icon_component_generic],
    ])('should resolve the %s component icon', async (elementName, expectedIcon) => {
      await expect(NodeIconResolver.getIcon(elementName, CatalogKind.Component)).resolves.toBe(expectedIcon);
    });

    it.each(['non-existing-component', 'toString', 'constructor'])(
      'should fallback to the default camel icon for %s',
      async (elementName) => {
        await expect(NodeIconResolver.getIcon(elementName, CatalogKind.Component)).resolves.toBe(
          NodeIconResolver.getDefaultCamelIcon(),
        );
      },
    );
  });

  describe('EIPs', () => {
    it.each([
      [CatalogKind.Pattern, 'choice', icon_eip_choice],
      [CatalogKind.Processor, 'from', expandIcon],
      [CatalogKind.Processor, 'unmarshal', icon_eip_transform],
    ])('should resolve the %s %s icon', async (catalogKind, elementName, expectedIcon) => {
      await expect(NodeIconResolver.getIcon(elementName, catalogKind)).resolves.toBe(expectedIcon);
    });

    it('should fallback to the default camel icon for unknown EIPs', async () => {
      await expect(NodeIconResolver.getIcon('non-existing-eip', CatalogKind.Processor)).resolves.toBe(
        NodeIconResolver.getDefaultCamelIcon(),
      );
    });
  });

  it('should fallback to the default citrus icon for unknown test actions', async () => {
    await expect(NodeIconResolver.getIcon('non-existing-action', CatalogKind.TestAction)).resolves.toBe(
      icon_citrus_logo,
    );
  });
});
