import { Chemistry, Cube, DocumentConfiguration, Xml } from '@carbon/icons-react';
import { ComponentType } from 'react';

import { StarterTemplateName } from '../../services/templates/starter-templates';

/** A type of file that the Create New File modal creates from a starter template of the catalog */
export interface FileKind {
  id: string;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  extension: string;
  /** The `.yml` spelling of a YAML extension, which starts from the same template in the Explorer */
  alternateExtensions?: string;
  template: StarterTemplateName;
}

export const FILE_KINDS: FileKind[] = [
  {
    id: 'camel-route-yaml',
    label: 'Camel Route YAML',
    description: 'Define an Apache Camel integration route using YAML DSL',
    icon: DocumentConfiguration,
    extension: '.camel.yaml',
    alternateExtensions: '.camel.yml',
    template: 'camel-route-yaml',
  },
  {
    id: 'camel-route-xml',
    label: 'Camel Route XML',
    description: 'Define an Apache Camel integration route using XML DSL',
    icon: Xml,
    extension: '.camel.xml',
    template: 'camel-route-xml',
  },
  {
    id: 'kamelet',
    label: 'Kamelet',
    description: 'Reusable Camel route template with a well-defined interface',
    icon: Cube,
    extension: '.kamelet.yaml',
    alternateExtensions: '.kamelet.yml',
    template: 'kamelet-source-yaml',
  },
  {
    id: 'citrus-test',
    label: 'Citrus Test',
    description: 'Integration test using the Citrus testing framework',
    icon: Chemistry,
    extension: '.citrus.yaml',
    alternateExtensions: '.citrus.yml',
    template: 'citrus-yaml',
  },
  {
    id: 'citrus-test-xml',
    label: 'Citrus Test XML',
    description: 'Integration test using the Citrus testing framework with XML DSL',
    icon: Chemistry,
    extension: '.citrus.xml',
    template: 'citrus-xml',
  },
];
