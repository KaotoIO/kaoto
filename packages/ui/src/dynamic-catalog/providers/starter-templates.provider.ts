import { ICatalogProvider } from '../models';

export class StarterTemplatesProvider implements ICatalogProvider<string> {
  readonly id = 'starter-templates-provider';

  constructor(private readonly embeddedTemplates: Record<string, string> = {}) {}

  async fetch(key: string): Promise<string | undefined> {
    return this.embeddedTemplates[key];
  }

  async fetchAll(): Promise<Record<string, string>> {
    return this.embeddedTemplates;
  }
}
