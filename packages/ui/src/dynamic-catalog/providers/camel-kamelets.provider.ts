import { FileTypes, FileTypesResponse } from '../../models/file-types';
import { IKameletDefinition } from '../../models/kamelets-catalog';
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
        acc[filename] = JSON.parse(content) as IKameletDefinition;
        return acc;
      },
      {} as Record<string, IKameletDefinition>,
    );

    return { ...this.embeddedKamelets, ...remoteKamelets };
  }
}
