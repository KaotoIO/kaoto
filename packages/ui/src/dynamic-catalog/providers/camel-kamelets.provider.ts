import { parse } from 'yaml';

import { IKameletDefinition } from '../../models/camel/kamelets-catalog';
import { FileTypes, FileTypesResponse } from '../../models/file-types';
import { ICatalogProvider } from '../models';

export class CamelKameletsProvider implements ICatalogProvider<IKameletDefinition> {
  readonly id = 'camel-kamelets-provider';

  constructor(
    private readonly embeddedKamelets: Record<string, IKameletDefinition> = {},
    private readonly client: (filetype: FileTypes) => Promise<FileTypesResponse[]> = () => Promise.resolve([]),
  ) {}

  async fetch(key: string): Promise<IKameletDefinition | undefined> {
    const combinedKamelets = await this.fetchAll();

    return combinedKamelets[key];
  }

  async fetchAll(): Promise<Record<string, IKameletDefinition>> {
    const remoteResources = (await this.client(FileTypes.Kamelets)) ?? [];
    const remoteKamelets = remoteResources.reduce(
      (acc, { filename, content }) => {
        try {
          const remoteKamelet = parse(content) as IKameletDefinition;
          const name = remoteKamelet.metadata.name;
          if (!name) {
            throw new TypeError('Missing `metadata.name` property');
          }

          acc[name] = remoteKamelet;
        } catch (error) {
          console.error(`Error parsing ${filename}`, error);
        }

        return acc;
      },
      {} as Record<string, IKameletDefinition>,
    );

    return { ...this.embeddedKamelets, ...remoteKamelets };
  }
}
