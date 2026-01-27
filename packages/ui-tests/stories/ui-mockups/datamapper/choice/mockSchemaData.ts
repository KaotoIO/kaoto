import { Types } from '@kaoto/kaoto/testing';

export interface MockFieldNode {
  id: string;
  displayName: string;
  type: Types;
  path: string;
  description?: string;
  children?: MockTreeNode[];
}

export interface MockChoiceNode {
  id: string;
  title: string;
  isChoice: true;
  isArtificialContainer: true;
  maxOccurs: number;
  members: MockTreeNode[];
  selectedMemberId?: string;
  isExpanded: boolean;
  path: string;
}

export type MockTreeNode = MockFieldNode | MockChoiceNode;

export function isChoiceNode(node: MockTreeNode): node is MockChoiceNode {
  return 'isChoice' in node && node.isChoice === true;
}

export const mockContactInfoChoice: MockChoiceNode = {
  id: 'contact-choice',
  title: 'choice (email | phone | address)',
  isChoice: true,
  isArtificialContainer: true,
  maxOccurs: 1,
  path: 'contactInfo',
  isExpanded: true,
  members: [
    {
      id: 'email',
      displayName: 'email',
      type: Types.String,
      path: 'contactInfo.email',
      description: 'Email address of the contact',
    },
    {
      id: 'phone',
      displayName: 'phone',
      type: Types.String,
      path: 'contactInfo.phone',
      description: 'Phone number of the contact',
    },
    {
      id: 'address',
      displayName: 'address',
      type: Types.Container,
      path: 'contactInfo.address',
      description: 'Physical address of the contact',
      children: [
        {
          id: 'address.street',
          displayName: 'street',
          type: Types.String,
          path: 'contactInfo.address.street',
        },
        {
          id: 'address.city',
          displayName: 'city',
          type: Types.String,
          path: 'contactInfo.address.city',
        },
        {
          id: 'address.zipCode',
          displayName: 'zipCode',
          type: Types.String,
          path: 'contactInfo.address.zipCode',
        },
      ],
    },
  ],
};

export const mockPreferredMethodsChoice: MockChoiceNode = {
  id: 'preferred-methods-choice',
  title: 'choice (sms | email | push)',
  isChoice: true,
  isArtificialContainer: true,
  maxOccurs: -1,
  path: 'preferredContactMethods',
  isExpanded: true,
  members: [
    {
      id: 'sms',
      displayName: 'sms',
      type: Types.Container,
      path: 'preferredContactMethods.sms',
      description: 'SMS notification settings',
      children: [
        {
          id: 'sms.number',
          displayName: 'number',
          type: Types.String,
          path: 'preferredContactMethods.sms.number',
        },
        {
          id: 'sms.carrier',
          displayName: 'carrier',
          type: Types.String,
          path: 'preferredContactMethods.sms.carrier',
        },
      ],
    },
    {
      id: 'email',
      displayName: 'email',
      type: Types.Container,
      path: 'preferredContactMethods.email',
      description: 'Email notification settings',
      children: [
        {
          id: 'email.address',
          displayName: 'address',
          type: Types.String,
          path: 'preferredContactMethods.email.address',
        },
        {
          id: 'email.format',
          displayName: 'format',
          type: Types.String,
          path: 'preferredContactMethods.email.format',
        },
      ],
    },
    {
      id: 'push',
      displayName: 'push',
      type: Types.Container,
      path: 'preferredContactMethods.push',
      description: 'Push notification settings',
      children: [
        {
          id: 'push.deviceId',
          displayName: 'deviceId',
          type: Types.String,
          path: 'preferredContactMethods.push.deviceId',
        },
        {
          id: 'push.platform',
          displayName: 'platform',
          type: Types.String,
          path: 'preferredContactMethods.push.platform',
        },
      ],
    },
  ],
};

export const mockNestedChoice: MockChoiceNode = {
  id: 'payment-choice',
  title: 'choice (creditCard | bankTransfer | paypal)',
  isChoice: true,
  isArtificialContainer: true,
  maxOccurs: 1,
  path: 'paymentMethod',
  isExpanded: true,
  members: [
    {
      id: 'creditCard',
      displayName: 'creditCard',
      type: Types.Container,
      path: 'paymentMethod.creditCard',
      description: 'Credit card payment',
      children: [
        {
          id: 'creditCard.number',
          displayName: 'number',
          type: Types.String,
          path: 'paymentMethod.creditCard.number',
        },
        {
          id: 'creditCard.type-choice',
          title: 'choice (visa | mastercard | amex)',
          isChoice: true,
          isArtificialContainer: true,
          maxOccurs: 1,
          path: 'paymentMethod.creditCard.cardType',
          isExpanded: false,
          members: [
            {
              id: 'visa',
              displayName: 'visa',
              type: Types.String,
              path: 'paymentMethod.creditCard.cardType.visa',
            },
            {
              id: 'mastercard',
              displayName: 'mastercard',
              type: Types.String,
              path: 'paymentMethod.creditCard.cardType.mastercard',
            },
            {
              id: 'amex',
              displayName: 'amex',
              type: Types.String,
              path: 'paymentMethod.creditCard.cardType.amex',
            },
          ],
        } as MockChoiceNode,
        {
          id: 'creditCard.cvv',
          displayName: 'cvv',
          type: Types.String,
          path: 'paymentMethod.creditCard.cvv',
        },
      ],
    },
    {
      id: 'bankTransfer',
      displayName: 'bankTransfer',
      type: Types.Container,
      path: 'paymentMethod.bankTransfer',
      description: 'Bank transfer payment',
      children: [
        {
          id: 'bankTransfer.accountNumber',
          displayName: 'accountNumber',
          type: Types.String,
          path: 'paymentMethod.bankTransfer.accountNumber',
        },
        {
          id: 'bankTransfer.routingNumber',
          displayName: 'routingNumber',
          type: Types.String,
          path: 'paymentMethod.bankTransfer.routingNumber',
        },
      ],
    },
    {
      id: 'paypal',
      displayName: 'paypal',
      type: Types.Container,
      path: 'paymentMethod.paypal',
      description: 'PayPal payment',
      children: [
        {
          id: 'paypal.email',
          displayName: 'email',
          type: Types.String,
          path: 'paymentMethod.paypal.email',
        },
      ],
    },
  ],
};

export const mockPersonWithChoice: MockFieldNode = {
  id: 'person',
  displayName: 'person',
  type: Types.Container,
  path: 'person',
  children: [
    {
      id: 'person.firstName',
      displayName: 'firstName',
      type: Types.String,
      path: 'person.firstName',
    },
    {
      id: 'person.lastName',
      displayName: 'lastName',
      type: Types.String,
      path: 'person.lastName',
    },
    {
      id: 'person.age',
      displayName: 'age',
      type: Types.Integer,
      path: 'person.age',
    },
    mockContactInfoChoice,
  ],
};

export function createMockTreeWithSelection(baseNode: MockTreeNode, selections: Record<string, string>): MockTreeNode {
  if (isChoiceNode(baseNode)) {
    const selectedMemberId = selections[baseNode.id];
    if (selectedMemberId) {
      const selectedMember = baseNode.members.find((member) => member.id === selectedMemberId);
      if (selectedMember) {
        return createMockTreeWithSelection(selectedMember, selections) as MockTreeNode;
      }
    }
    return {
      ...baseNode,
      members: baseNode.members.map((member) => createMockTreeWithSelection(member, selections) as MockTreeNode),
    };
  }

  if (baseNode.children) {
    return {
      ...baseNode,
      children: baseNode.children.map((child) => createMockTreeWithSelection(child, selections)),
    };
  }

  return baseNode;
}

export function getChoiceDisplayName(choice: MockChoiceNode, maxDisplay: number = 3): string {
  const choiceMembers = choice.members.filter(isChoiceNode);
  const choiceMemberCount = choiceMembers.length;

  const memberNames = choice.members.map((member) => {
    if (isChoiceNode(member) && choiceMemberCount > 1) {
      const index = choiceMembers.indexOf(member) + 1;
      return `choice${index}`;
    }
    return member.displayName || (isChoiceNode(member) ? 'choice' : '');
  });

  if (memberNames.length <= maxDisplay) {
    return `choice (${memberNames.join(' | ')})`;
  }
  const displayed = memberNames.slice(0, maxDisplay).join(' | ');
  const remaining = memberNames.length - maxDisplay;
  return `choice (${displayed} ... +${remaining} more)`;
}

export const mockConditionalMappingSource: MockChoiceNode = {
  id: 'source-contact-choice',
  title: 'choice (email | phone | address)',
  isChoice: true,
  isArtificialContainer: true,
  maxOccurs: 1,
  path: 'source.contactInfo',
  isExpanded: false,
  members: [
    {
      id: 'source-email',
      displayName: 'email',
      type: Types.String,
      path: 'source.contactInfo.email',
      description: 'Email address',
    },
    {
      id: 'source-phone',
      displayName: 'phone',
      type: Types.String,
      path: 'source.contactInfo.phone',
      description: 'Phone number',
    },
    {
      id: 'source-address',
      displayName: 'address',
      type: Types.Container,
      path: 'source.contactInfo.address',
      description: 'Physical address',
      children: [
        {
          id: 'source-address.street',
          displayName: 'street',
          type: Types.String,
          path: 'source.contactInfo.address.street',
        },
        {
          id: 'source-address.city',
          displayName: 'city',
          type: Types.String,
          path: 'source.contactInfo.address.city',
        },
      ],
    },
  ],
};

export const mockManyOptionsChoice: MockChoiceNode = {
  id: 'notification-choice',
  title: 'choice (email | sms | push | slack | teams | webhook | telegram | discord)',
  isChoice: true,
  isArtificialContainer: true,
  maxOccurs: 1,
  path: 'notificationChannel',
  isExpanded: true,
  members: [
    {
      id: 'email-notif',
      displayName: 'email',
      type: Types.String,
      path: 'notificationChannel.email',
      description: 'Email notification',
    },
    {
      id: 'sms-notif',
      displayName: 'sms',
      type: Types.String,
      path: 'notificationChannel.sms',
      description: 'SMS notification',
    },
    {
      id: 'push-notif',
      displayName: 'push',
      type: Types.String,
      path: 'notificationChannel.push',
      description: 'Push notification',
    },
    {
      id: 'slack-notif',
      displayName: 'slack',
      type: Types.String,
      path: 'notificationChannel.slack',
      description: 'Slack notification',
    },
    {
      id: 'teams-notif',
      displayName: 'teams',
      type: Types.String,
      path: 'notificationChannel.teams',
      description: 'Microsoft Teams notification',
    },
    {
      id: 'webhook-notif',
      displayName: 'webhook',
      type: Types.String,
      path: 'notificationChannel.webhook',
      description: 'Webhook notification',
    },
    {
      id: 'telegram-notif',
      displayName: 'telegram',
      type: Types.String,
      path: 'notificationChannel.telegram',
      description: 'Telegram notification',
    },
    {
      id: 'discord-notif',
      displayName: 'discord',
      type: Types.String,
      path: 'notificationChannel.discord',
      description: 'Discord notification',
    },
  ],
};

export const mockEmailOrPhoneChoice: MockChoiceNode = {
  id: 'email-or-phone-choice',
  title: 'choice (email | phone)',
  isChoice: true,
  isArtificialContainer: true,
  maxOccurs: 1,
  path: 'directNested.emailOrPhone',
  isExpanded: true,
  members: [
    {
      id: 'nested-email',
      displayName: 'email',
      type: Types.String,
      path: 'directNested.emailOrPhone.email',
      description: 'Email address',
    },
    {
      id: 'nested-phone',
      displayName: 'phone',
      type: Types.String,
      path: 'directNested.emailOrPhone.phone',
      description: 'Phone number',
    },
  ],
};

export const mockSmsOrPushChoice: MockChoiceNode = {
  id: 'sms-or-push-choice',
  title: 'choice (sms | push)',
  isChoice: true,
  isArtificialContainer: true,
  maxOccurs: 1,
  path: 'directNested.smsOrPush',
  isExpanded: true,
  members: [
    {
      id: 'nested-sms',
      displayName: 'sms',
      type: Types.String,
      path: 'directNested.smsOrPush.sms',
      description: 'SMS number',
    },
    {
      id: 'nested-push',
      displayName: 'push',
      type: Types.String,
      path: 'directNested.smsOrPush.push',
      description: 'Push token',
    },
  ],
};

export const mockDirectNestedChoice: MockChoiceNode = {
  id: 'direct-nested-choice',
  title: 'choice (choice1 | choice2 | name)',
  isChoice: true,
  isArtificialContainer: true,
  maxOccurs: 1,
  path: 'directNested',
  isExpanded: true,
  members: [
    mockEmailOrPhoneChoice,
    mockSmsOrPushChoice,
    {
      id: 'nested-name',
      displayName: 'name',
      type: Types.String,
      path: 'directNested.name',
      description: 'Person name',
    },
  ],
};

export const mockPersonWithMultipleChoices: MockFieldNode = {
  id: 'person-multi',
  displayName: 'person',
  type: Types.Container,
  path: 'person',
  children: [
    {
      id: 'person-multi.firstName',
      displayName: 'firstName',
      type: Types.String,
      path: 'person.firstName',
    },
    {
      id: 'person-multi.lastName',
      displayName: 'lastName',
      type: Types.String,
      path: 'person.lastName',
    },
    {
      id: 'person-multi.age',
      displayName: 'age',
      type: Types.Integer,
      path: 'person.age',
    },
    mockContactInfoChoice,
    mockManyOptionsChoice,
    mockPreferredMethodsChoice,
  ],
};

export const mockConditionalMappingTarget: MockFieldNode = {
  id: 'target-root',
  displayName: 'customer',
  type: Types.Container,
  path: 'target.customer',
  children: [
    {
      id: 'target-choose',
      displayName: 'choose',
      type: Types.Container,
      path: 'target.customer.choose',
      description: 'Conditional mapping based on source choice',
      children: [
        {
          id: 'target-when-email',
          displayName: 'when test="email"',
          type: Types.Container,
          path: 'target.customer.choose.when[1]',
          children: [
            {
              id: 'target-email-value',
              displayName: 'contactValue',
              type: Types.String,
              path: 'target.customer.choose.when[1].contactValue',
              description: 'Mapped from source.contactInfo.email',
            },
            {
              id: 'target-email-type',
              displayName: 'contactType',
              type: Types.String,
              path: 'target.customer.choose.when[1].contactType',
              description: 'Set to "EMAIL"',
            },
          ],
        },
        {
          id: 'target-when-phone',
          displayName: 'when test="phone"',
          type: Types.Container,
          path: 'target.customer.choose.when[2]',
          children: [
            {
              id: 'target-phone-value',
              displayName: 'contactValue',
              type: Types.String,
              path: 'target.customer.choose.when[2].contactValue',
              description: 'Mapped from source.contactInfo.phone',
            },
            {
              id: 'target-phone-type',
              displayName: 'contactType',
              type: Types.String,
              path: 'target.customer.choose.when[2].contactType',
              description: 'Set to "PHONE"',
            },
          ],
        },
        {
          id: 'target-when-address',
          displayName: 'when test="address"',
          type: Types.Container,
          path: 'target.customer.choose.when[3]',
          children: [
            {
              id: 'target-address-street',
              displayName: 'street',
              type: Types.String,
              path: 'target.customer.choose.when[3].street',
              description: 'Mapped from source.contactInfo.address.street',
            },
            {
              id: 'target-address-city',
              displayName: 'city',
              type: Types.String,
              path: 'target.customer.choose.when[3].city',
              description: 'Mapped from source.contactInfo.address.city',
            },
            {
              id: 'target-address-type',
              displayName: 'contactType',
              type: Types.String,
              path: 'target.customer.choose.when[3].contactType',
              description: 'Set to "ADDRESS"',
            },
          ],
        },
        {
          id: 'target-otherwise',
          displayName: 'otherwise',
          type: Types.Container,
          path: 'target.customer.choose.otherwise',
          children: [
            {
              id: 'target-otherwise-value',
              displayName: 'contactValue',
              type: Types.String,
              path: 'target.customer.choose.otherwise.contactValue',
              description: 'Default value',
            },
          ],
        },
      ],
    },
  ],
};
