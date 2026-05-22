import { Types } from '@kaoto/kaoto/testing';

export interface MockFieldNode {
  id: string;
  displayName: string;
  type: Types;
  path: string;
  description?: string;
  children?: MockAbstractTreeNode[];
}

export interface MockAbstractNode {
  id: string;
  elementName: string;
  isAbstract: true;
  maxOccurs: number;
  candidates: MockFieldNode[];
  isExpanded: boolean;
  path: string;
}

export type MockAbstractTreeNode = MockFieldNode | MockAbstractNode;

export function isAbstractNode(node: MockAbstractTreeNode): node is MockAbstractNode {
  return 'isAbstract' in node && node.isAbstract === true;
}

export interface MockInstruction {
  id: string;
  kind: 'for-each' | 'if' | 'choose' | 'when' | 'otherwise';
  children?: MockInstruction[];
  initialFieldIds?: string[];
  showAbstractField?: boolean;
}

const mockCatCandidate: MockFieldNode = {
  id: 'cat',
  displayName: 'Cat',
  type: Types.Container,
  path: 'Zoo/AbstractAnimal/Cat',
  description: 'A domestic cat (Cat_t)',
  children: [
    { id: 'cat-name', displayName: 'name', type: Types.String, path: 'Zoo/AbstractAnimal/Cat/name' },
    { id: 'cat-indoor', displayName: 'indoor', type: Types.Boolean, path: 'Zoo/AbstractAnimal/Cat/indoor' },
  ],
};

const mockDogCandidate: MockFieldNode = {
  id: 'dog',
  displayName: 'Dog',
  type: Types.Container,
  path: 'Zoo/AbstractAnimal/Dog',
  description: 'A domestic dog (Dog_t)',
  children: [
    { id: 'dog-name', displayName: 'name', type: Types.String, path: 'Zoo/AbstractAnimal/Dog/name' },
    { id: 'dog-breed', displayName: 'breed', type: Types.String, path: 'Zoo/AbstractAnimal/Dog/breed' },
  ],
};

const mockFishCandidate: MockFieldNode = {
  id: 'fish',
  displayName: 'Fish',
  type: Types.Container,
  path: 'Zoo/AbstractAnimal/Fish',
  description: 'A fish with inline type definition',
  children: [
    { id: 'fish-name', displayName: 'name', type: Types.String, path: 'Zoo/AbstractAnimal/Fish/name' },
    {
      id: 'fish-freshwater',
      displayName: 'freshwater',
      type: Types.Boolean,
      path: 'Zoo/AbstractAnimal/Fish/freshwater',
    },
  ],
};

const mockKittenCandidate: MockFieldNode = {
  id: 'kitten',
  displayName: 'Kitten',
  type: Types.Container,
  path: 'Zoo/AbstractAnimal/Kitten',
  description: 'A kitten, extends Feline_t → Animal_t',
  children: [
    { id: 'kitten-name', displayName: 'name', type: Types.String, path: 'Zoo/AbstractAnimal/Kitten/name' },
    { id: 'kitten-indoor', displayName: 'indoor', type: Types.Boolean, path: 'Zoo/AbstractAnimal/Kitten/indoor' },
    { id: 'kitten-age', displayName: 'age', type: Types.Integer, path: 'Zoo/AbstractAnimal/Kitten/age' },
  ],
};

export const mockAbstractAnimal: MockAbstractNode = {
  id: 'abstract-animal',
  elementName: 'AbstractAnimal',
  isAbstract: true,
  maxOccurs: -1,
  candidates: [mockCatCandidate, mockDogCandidate, mockFishCandidate, mockKittenCandidate],
  isExpanded: true,
  path: 'Zoo/AbstractAnimal',
};

export const mockAbstractLabel: MockAbstractNode = {
  id: 'abstract-label',
  elementName: 'AbstractLabel',
  isAbstract: true,
  maxOccurs: 1,
  candidates: [
    {
      id: 'nickname',
      displayName: 'Nickname',
      type: Types.String,
      path: 'Zoo/AbstractLabel/Nickname',
      description: 'A nickname (Nickname_t, max 50 chars)',
    },
    {
      id: 'xs-string-tag',
      displayName: 'XsStringTag',
      type: Types.String,
      path: 'Zoo/AbstractLabel/XsStringTag',
      description: 'A plain xs:string tag',
    },
  ],
  isExpanded: true,
  path: 'Zoo/AbstractLabel',
};

export const mockZooSingle: MockFieldNode = {
  id: 'zoo',
  displayName: 'Zoo',
  type: Types.Container,
  path: 'Zoo',
  children: [mockAbstractLabel],
};

export const mockZooCollection: MockFieldNode = {
  id: 'zoo',
  displayName: 'Zoo',
  type: Types.Container,
  path: 'Zoo',
  children: [mockAbstractAnimal],
};

function generateManyCandidates(count: number): MockFieldNode[] {
  const candidates: MockFieldNode[] = [];
  for (let i = 1; i <= count; i++) {
    const name = `MsgType${String(i).padStart(3, '0')}`;
    candidates.push({
      id: `msg-${name.toLowerCase()}`,
      displayName: name,
      type: Types.Container,
      path: `Envelope/AbstractMessage/${name}`,
      description: `Message type ${name}`,
      children: [
        {
          id: `msg-${name.toLowerCase()}-id`,
          displayName: 'msgId',
          type: Types.String,
          path: `Envelope/AbstractMessage/${name}/msgId`,
        },
        {
          id: `msg-${name.toLowerCase()}-timestamp`,
          displayName: 'timestamp',
          type: Types.String,
          path: `Envelope/AbstractMessage/${name}/timestamp`,
        },
        {
          id: `msg-${name.toLowerCase()}-payload`,
          displayName: 'payload',
          type: Types.Container,
          path: `Envelope/AbstractMessage/${name}/payload`,
          children: [
            {
              id: `msg-${name.toLowerCase()}-payload-data`,
              displayName: 'data',
              type: Types.String,
              path: `Envelope/AbstractMessage/${name}/payload/data`,
            },
          ],
        },
      ],
    });
  }
  return candidates;
}

export const mockManyAbstract: MockAbstractNode = {
  id: 'many-abstract-message',
  elementName: 'AbstractMessage',
  isAbstract: true,
  maxOccurs: 1,
  candidates: generateManyCandidates(200),
  isExpanded: true,
  path: 'Envelope/AbstractMessage',
};

export const mockManyRoot: MockFieldNode = {
  id: 'envelope-root',
  displayName: 'Envelope',
  type: Types.Container,
  path: 'Envelope',
  children: [mockManyAbstract],
};

export function getAbstractDisplayName(node: MockAbstractNode, maxDisplay = 3): string {
  const names = node.candidates.map((c) => c.displayName);
  if (names.length <= maxDisplay) {
    return `(${names.join(' | ')})`;
  }
  const displayed = names.slice(0, maxDisplay).join(' | ');
  const remaining = names.length - maxDisplay;
  return `(${displayed} | +${remaining} more)`;
}
