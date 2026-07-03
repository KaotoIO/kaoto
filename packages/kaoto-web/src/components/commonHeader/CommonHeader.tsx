import { AspectRatio, Column, Grid, Heading } from '@carbon/react';
import { ReactNode } from 'react';

export interface CommonHeaderParagraph {
  id: string;
  content: ReactNode;
}

interface CommonHeaderProps {
  title: string;
  paragraphs: CommonHeaderParagraph[];
}

export const CommonHeader = ({ title, paragraphs }: CommonHeaderProps) => {
  return (
    <Grid as="header" className="cs--common-header">
      <Column sm={4} md={8} lg={8}>
        <AspectRatio as="section" ratio="16x9">
          <Heading className="cs--common-header__title">{title}</Heading>
          {paragraphs.map((paragraph) => (
            <p key={paragraph.id}>{paragraph.content}</p>
          ))}
        </AspectRatio>
      </Column>
      <Column sm={4} md={8} lg={8}>
        <AspectRatio ratio="16x9" className="cs--common-header__image-banner">
          <img src="/icon.dark.svg?version=0.1.0" className="cs--common-header__logo" alt="fed-at-ibm logo" />
        </AspectRatio>
      </Column>
    </Grid>
  );
};
