import { EditService } from './EditService';

describe('EditService', () => {
  const text = 'Hello, World!';
  let service: EditService;

  beforeEach(() => {
    jest.resetModules();
    service = EditService.getInstance();
    service.clearEdits();
  });

  afterEach(() => {
    service.clearEdits();
  });

  it('should return the same instance', () => {
    const anotherEditService = EditService.getInstance();

    expect(service).toBe(anotherEditService);
  });

  it('should not throw when registering an edit', async () => {
    expect(async () => {
      await service.registerEdit(text);
    }).not.toThrow();
  });

  it('should allow consumers registering an edit', async () => {
    const serviceTest = new EditServiceTest();
    await serviceTest.registerEdit(text);

    expect(serviceTest.getHashes()).toHaveLength(1);
  });

  describe('isStaleEdit', () => {
    it('should return false if there is no other edit', async () => {
      const isStale = await service.isStaleEdit(text);

      expect(isStale).toBe(false);
    });

    it('should return false if the edit matches the last one', async () => {
      await service.registerEdit(text);
      const isStale = await service.isStaleEdit(text);

      expect(isStale).toBe(false);
    });

    it('should return false if the content hash is not registered already', async () => {
      await service.registerEdit(text);
      const isStale = await service.isStaleEdit('Hello, World!');

      expect(isStale).toBe(false);
    });

    it('should return true if the content hash is already registered but not the last one', async () => {
      await service.registerEdit(text);
      await service.registerEdit('This is a new edit');
      const isStale = await service.isStaleEdit(text);

      expect(isStale).toBe(true);
    });
  });

  it('should clear all edits', async () => {
    const serviceTest = new EditServiceTest();
    await serviceTest.registerEdit(text);
    await serviceTest.registerEdit(text);

    serviceTest.clearEdits();

    expect(serviceTest.getHashes()).toHaveLength(0);
  });
});

class EditServiceTest extends EditService {
  getHashes() {
    return this.hashes;
  }
}
