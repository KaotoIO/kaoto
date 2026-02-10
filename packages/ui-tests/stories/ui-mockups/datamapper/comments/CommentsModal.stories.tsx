import { Button } from '@patternfly/react-core';
import { Meta, StoryFn } from '@storybook/react';
import { useState } from 'react';

import { CommentsMockup } from './CommentsMockup';
import { CommentsModal } from './CommentsModal';

export default {
  title: 'UI Mockups/DataMapper/CommentsModal',

  component: CommentsModal,
} as Meta<typeof CommentsModal>;

const Template: StoryFn<typeof CommentsModal> = (args) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ padding: '1rem' }}>
      <Button variant="primary" onClick={() => setIsOpen(true)} style={{ marginBottom: '1rem' }}>
        Open Modal
      </Button>
      <CommentsModal
        {...args}
        isOpen={isOpen}
        onCreateComment={(comment) => {
          console.log('Comment created:', comment);
          setIsOpen(false);
        }}
        onCancel={() => {
          console.log('Comment creation cancelled');
          setIsOpen(false);
        }}
      />
    </div>
  );
};

export const EmptyModal = Template.bind({});
EmptyModal.args = {
  initialComment: '',
};

export const ModalWithComment = Template.bind({});
ModalWithComment.args = {
  initialComment: 'This is a pre-filled comment',
};

// Story showcasing the full DataMapper mockup with source/target elements and comments functionality
export const DataMapperWithComments: StoryFn = () => {
  return (
    <div style={{ padding: '2rem', backgroundColor: '#f5f5f5' }}>
      <h2 style={{ marginBottom: '0.5rem' }}>Comments visualization</h2>
      <p style={{ marginBottom: '1rem', color: '#666', maxWidth: '800px' }}>
        When a comment is added to a mapping, it should be visible as an icon next to the mapped field. Hovering over
        the icon will display the comment content in a tooltip. This allows users to easily see and manage comments
        associated with their mappings without needing to open the comment modal each time.
      </p>
      <div
        style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '4px',
          border: '1px solid #ccc',
        }}
      >
        <CommentsMockup />;{' '}
      </div>
    </div>
  );
};
