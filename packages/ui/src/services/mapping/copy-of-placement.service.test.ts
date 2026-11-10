import { CopyOfSelector, CopyOfType, OtherwiseItem, WhenItem } from '../../models/datamapper/mapping';
import { CopyOfPlacementService } from './copy-of-placement.service';

describe('CopyOfPlacementService.isLeadingCopyOf', () => {
  it('should lead for an empty container-node copy-of', () => {
    const copyOf = new CopyOfSelector({} as never, CopyOfType.CONTAINER_NODE);
    expect(CopyOfPlacementService.isLeadingCopyOf(copyOf)).toBe(true);
  });

  it('should not lead for an xsl:otherwise holding only an empty copy-of', () => {
    const otherwise = new OtherwiseItem({} as never);
    otherwise.children.push(new CopyOfSelector(otherwise, CopyOfType.CONTAINER_NODE));
    expect(CopyOfPlacementService.isLeadingCopyOf(otherwise)).toBe(false);
  });

  it('should not lead for an xsl:when holding only an empty copy-of', () => {
    const when = new WhenItem({} as never);
    when.children.push(new CopyOfSelector(when, CopyOfType.CONTAINER_NODE));
    expect(CopyOfPlacementService.isLeadingCopyOf(when)).toBe(false);
  });
});
