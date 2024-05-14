import { Pipe as PipeType } from '@kaoto/camel-catalog/types';
import { ITile, TileFilter } from '../../components/Catalog/Catalog.models';
import { CatalogKind } from '../catalog-kind';
import { AddStepMode, IVisualizationNodeData } from '../visualization/base-visual-entity';
import { PipeVisualEntity } from '../visualization/flows';
import { FlowTemplateService } from '../visualization/flows/support/flow-templates-service';
import { PipeErrorHandlerEntity } from '../visualization/metadata/pipeErrorHandlerEntity';
import { CamelKResource } from './camel-k-resource';
import { BaseCamelEntity, PipeSpecErrorHandler } from './entities';
import { SourceSchemaType } from './source-schema-type';

export class PipeResource extends CamelKResource {
  protected pipe: PipeType;
  private flow?: PipeVisualEntity;
  private errorHandler?: PipeErrorHandlerEntity;

  constructor(pipe?: PipeType) {
    super(pipe);
    if (pipe) {
      this.pipe = pipe;
    } else {
      this.pipe = this.resource as PipeType;
      this.pipe.kind = SourceSchemaType.Pipe;
    }
    if (!this.pipe.spec) {
      this.pipe.spec = {};
    }
    this.flow = new PipeVisualEntity(this.pipe);
    this.errorHandler =
      this.pipe.spec.errorHandler && new PipeErrorHandlerEntity(this.pipe.spec as PipeSpecErrorHandler);
  }

  removeEntity(): void {
    super.removeEntity();
    const flowTemplate: PipeType = FlowTemplateService.getFlowTemplate(this.getType());
    this.pipe = flowTemplate;
    this.flow = new PipeVisualEntity(flowTemplate);
  }

  getEntities(): BaseCamelEntity[] {
    const answer = super.getEntities();
    if (this.pipe.spec!.errorHandler && this.errorHandler) {
      answer.push(this.errorHandler);
    }
    return answer;
  }

  getType(): SourceSchemaType {
    return SourceSchemaType.Pipe;
  }

  refreshVisualMetadata() {
    this.flow = new PipeVisualEntity(this.pipe);
  }

  getVisualEntities(): PipeVisualEntity[] {
    return this.flow ? [this.flow] : [];
  }

  toJSON(): PipeType {
    return this.pipe;
  }

  createErrorHandlerEntity() {
    this.pipe.spec!.errorHandler = {};
    this.errorHandler = new PipeErrorHandlerEntity(this.pipe.spec as PipeSpecErrorHandler);
    return this.errorHandler;
  }

  getErrorHandlerEntity() {
    return this.errorHandler;
  }

  deleteErrorHandlerEntity() {
    this.pipe.spec!.errorHandler = undefined;
    this.errorHandler = undefined;
  }

  /** Components Catalog related methods */
  getCompatibleComponents(mode: AddStepMode, visualEntityData: IVisualizationNodeData): TileFilter {
    let kameletType: string = 'action';

    if (mode === AddStepMode.ReplaceStep && (visualEntityData.path === 'source' || visualEntityData.path === 'sink')) {
      kameletType = visualEntityData.path;
    }

    return (item: ITile) => {
      return item.type === CatalogKind.Kamelet && item.tags.includes(kameletType);
    };
  }
}
