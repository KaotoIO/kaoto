import { RadioTile, TileGroup } from '@carbon/react';
import { FunctionComponent } from 'react';

import { FileKind } from './file-kinds';

interface FileKindTilesProps {
  /** The file types to choose from, one tile each */
  kinds: FileKind[];
  selected: FileKind;
  disabled?: boolean;
  onChange: (kind: FileKind) => void;
}

/** The file types of the Create New File modal as tiles, of which one is selected: icon, label and description */
export const FileKindTiles: FunctionComponent<FileKindTilesProps> = ({ kinds, selected, disabled, onChange }) => {
  const handleChange = (value: string | number) => {
    // The value is always the id of one of the tiles
    onChange(kinds.find((candidate) => candidate.id === value)!);
  };

  return (
    <TileGroup
      legend="File type"
      name="file-type"
      className="cds--tile-group cs--create-file-modal__types"
      disabled={disabled}
      valueSelected={selected.id}
      onChange={handleChange}
    >
      {kinds.map((kind) => {
        const Icon = kind.icon;
        return (
          <RadioTile
            key={kind.id}
            id={`cs--create-file-kind-${kind.id}`}
            value={kind.id}
            className="cs--create-file-modal__type"
          >
            <span className="cs--create-file-modal__type-content">
              <Icon
                className={`cs--create-file-modal__type-icon cs--create-file-modal__type-icon--${kind.id}`}
                aria-hidden
              />
              <span className="cs--create-file-modal__type-text">
                <span className="cs--create-file-modal__type-label">{kind.label}</span>
                <span className="cs--create-file-modal__type-description">{kind.description}</span>
              </span>
            </span>
          </RadioTile>
        );
      })}
    </TileGroup>
  );
};
