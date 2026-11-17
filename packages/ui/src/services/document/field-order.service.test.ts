import { IField } from '../../models/datamapper/document';
import { TestUtil } from '../../stubs/datamapper/data-mapper';
import { FieldOrderService } from './field-order.service';

function findField(fields: IField[], name: string): IField {
  const field = fields.find((f) => f.name === name);
  if (!field) throw new Error(`field "${name}" not found among [${fields.map((f) => f.name).join(', ')}]`);
  return field;
}

describe('FieldOrderService', () => {
  describe('plain siblings', () => {
    const doc = TestUtil.createTargetOrderDoc();
    const shipOrder = doc.fields[0];

    it('orders plain top-level siblings by their declared schema index', () => {
      const orderPerson = findField(shipOrder.fields, 'OrderPerson');
      const shipTo = findField(shipOrder.fields, 'ShipTo');
      const item = findField(shipOrder.fields, 'Item');

      expect(
        FieldOrderService.compareOrderPaths(
          FieldOrderService.getFieldOrderPath(orderPerson),
          FieldOrderService.getFieldOrderPath(shipTo),
        ),
      ).toBeLessThan(0);
      expect(
        FieldOrderService.compareOrderPaths(
          FieldOrderService.getFieldOrderPath(shipTo),
          FieldOrderService.getFieldOrderPath(item),
        ),
      ).toBeLessThan(0);
    });

    it('is antisymmetric', () => {
      const orderPerson = findField(shipOrder.fields, 'OrderPerson');
      const shipTo = findField(shipOrder.fields, 'ShipTo');
      const a = FieldOrderService.getFieldOrderPath(orderPerson);
      const b = FieldOrderService.getFieldOrderPath(shipTo);
      expect(FieldOrderService.compareOrderPaths(a, b)).toBe(-FieldOrderService.compareOrderPaths(b, a));
    });
  });

  describe('nested fields', () => {
    const doc = TestUtil.createTargetOrderDoc();
    const shipOrder = doc.fields[0];
    const shipTo = findField(shipOrder.fields, 'ShipTo');

    it('orders nested siblings by their schema index within the common parent', () => {
      const name = findField(shipTo.fields, 'Name');
      const address = findField(shipTo.fields, 'Address');
      expect(
        FieldOrderService.compareOrderPaths(
          FieldOrderService.getFieldOrderPath(name),
          FieldOrderService.getFieldOrderPath(address),
        ),
      ).toBeLessThan(0);
    });

    it('a shallower field sorts before a deeper one sharing the same prefix (path-prefix ordering)', () => {
      const orderPerson = findField(shipOrder.fields, 'OrderPerson');
      const name = findField(shipTo.fields, 'Name');
      // OrderPerson's path is a single index lower than ShipTo's; Name is nested one level under
      // ShipTo. The comparison is decided by the first differing index (OrderPerson < ShipTo), not path length.
      expect(
        FieldOrderService.compareOrderPaths(
          FieldOrderService.getFieldOrderPath(orderPerson),
          FieldOrderService.getFieldOrderPath(name),
        ),
      ).toBeLessThan(0);
    });

    it('compareOrderPaths falls back to path length when one path is a strict prefix of the other', () => {
      expect(FieldOrderService.compareOrderPaths([0], [0, 1])).toBeLessThan(0);
      expect(FieldOrderService.compareOrderPaths([0, 1], [0])).toBeGreaterThan(0);
      expect(FieldOrderService.compareOrderPaths([0, 1], [0, 1])).toBe(0);
    });
  });

  describe('choice-wrapper member vs. plain sibling', () => {
    const doc = TestUtil.createChoiceWithAbstractTargetDoc();
    const notification = doc.fields[0];
    const short = findField(notification.fields, 'Short');

    it("a choice member sorts relative to a plain sibling by the choice wrapper's own schema position", () => {
      // Short.fields: id (index 0), choice1 (index 1, contains Webhook), choice2 (index 2, contains WebhookMulti).
      const id = findField(short.fields, 'id');
      const choice1 = short.fields[1];
      const webhook = findField(choice1.fields, 'Webhook');

      expect(
        FieldOrderService.compareOrderPaths(
          FieldOrderService.getFieldOrderPath(id),
          FieldOrderService.getFieldOrderPath(webhook),
        ),
      ).toBeLessThan(0);
    });

    it('two choice-wrapper members in different choices compare by their own choice wrapper slot, not member index alone', () => {
      const choice1 = short.fields[1];
      const choice2 = short.fields[2];
      const webhook = findField(choice1.fields, 'Webhook');
      const webhookMulti = findField(choice2.fields, 'WebhookMulti');

      // Webhook is a member of the earlier (non-repeating) choice; WebhookMulti is a member of the
      // later (repeating) choice. Schema order places Webhook first, even though comparing their
      // member-only index (both are index 1 within their own choice) would not distinguish them;
      // only one root-to-leaf coordinate space across both `parent.fields` arrays does.
      expect(
        FieldOrderService.compareOrderPaths(
          FieldOrderService.getFieldOrderPath(webhook),
          FieldOrderService.getFieldOrderPath(webhookMulti),
        ),
      ).toBeLessThan(0);
    });
  });

  describe('abstract-wrapper case', () => {
    const doc = TestUtil.createChoiceWithAbstractTargetDoc();
    const notification = doc.fields[0];
    const short = findField(notification.fields, 'Short');
    const choice1 = short.fields[1];

    it('a substitution-group member nested under an abstract wrapper compares against a plain choice sibling', () => {
      // choice1.fields: abstract wrapper "AbstractMessage" (index 0, fields: Email, SMS), Webhook (index 1).
      const abstractWrapper = choice1.fields[0];
      expect(abstractWrapper.wrapperKind).toBe('abstract');
      const email = findField(abstractWrapper.fields, 'Email');
      const webhook = findField(choice1.fields, 'Webhook');

      // Email is nested one level deeper (under the abstract wrapper) than Webhook, but the abstract
      // wrapper occupies index 0 in choice1 — before Webhook's index 1 — so Email still sorts first.
      expect(
        FieldOrderService.compareOrderPaths(
          FieldOrderService.getFieldOrderPath(email),
          FieldOrderService.getFieldOrderPath(webhook),
        ),
      ).toBeLessThan(0);
    });
  });

  describe('detached field', () => {
    it("characterizes today's behavior: a field no longer present in its parent's `fields` ranks first (indexOf returns -1)", () => {
      const doc = TestUtil.createTargetOrderDoc();
      const shipOrder = doc.fields[0];
      const shipTo = findField(shipOrder.fields, 'ShipTo');
      const orderPerson = findField(shipOrder.fields, 'OrderPerson');

      const detachedPath = FieldOrderService.getFieldOrderPath(shipTo);
      shipOrder.fields = shipOrder.fields.filter((f) => f !== shipTo);
      const pathAfterDetach = FieldOrderService.getFieldOrderPath(shipTo);

      expect(detachedPath[detachedPath.length - 1]).not.toBe(-1);
      expect(pathAfterDetach[pathAfterDetach.length - 1]).toBe(-1);
      expect(
        FieldOrderService.compareOrderPaths(pathAfterDetach, FieldOrderService.getFieldOrderPath(orderPerson)),
      ).toBeLessThan(0);
    });
  });
});
