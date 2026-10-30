import { PathUtil } from './path-util';

describe('PathUtil', () => {
  describe('relativePath', () => {
    it('should return the file name for a file in the same directory', () => {
      expect(PathUtil.relativePath('wrapper.xsd', 'root.xsd')).toBe('root.xsd');
      expect(PathUtil.relativePath('schemas/wrapper.xsd', 'schemas/root.xsd')).toBe('root.xsd');
    });

    it('should descend into a subdirectory', () => {
      expect(PathUtil.relativePath('wrapper.xsd', 'schemas/root.xsd')).toBe('schemas/root.xsd');
      expect(PathUtil.relativePath('a/wrapper.xsd', 'a/b/c/root.xsd')).toBe('b/c/root.xsd');
    });

    it('should climb to a parent directory', () => {
      expect(PathUtil.relativePath('a/b/wrapper.xsd', 'root.xsd')).toBe('../../root.xsd');
      expect(PathUtil.relativePath('a/b/wrapper.xsd', 'a/root.xsd')).toBe('../root.xsd');
    });

    it('should move across sibling directories', () => {
      expect(PathUtil.relativePath('a/b/wrapper.xsd', 'a/c/root.xsd')).toBe('../c/root.xsd');
    });

    it('should normalize `.` and `..` segments in both inputs', () => {
      expect(PathUtil.relativePath('./a/../b/wrapper.xsd', 'b/./root.xsd')).toBe('root.xsd');
    });

    it('should handle absolute paths on both sides', () => {
      expect(PathUtil.relativePath('/a/b/wrapper.xsd', '/a/c/root.xsd')).toBe('../c/root.xsd');
    });
  });
});
