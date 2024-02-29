/*
    Copyright (C) 2017 Red Hat, Inc.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

            http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
import { FunctionComponent, MouseEvent, ReactElement, useContext, useMemo } from 'react';
import { SOURCES_FIELD_ID_PREFIX, TARGETS_FIELD_ID_PREFIX } from '../../../layout/views/sourceTarget/constants';

import { NodesArc } from '../../../_bk_atlasmap/UI';
import './SourceTargetLinks.css';
import { useToggle } from '../../../hooks';
import { IMapping } from '../../../models';
import { DataMapperContext } from '../../../providers';

export const SourceTargetLinks: FunctionComponent = () => {
  const { mappings, selectedMapping, setSelectedMapping } = useContext(DataMapperContext)!;
  const selectedMappingId = selectedMapping?.id;
  const sortedMappings = useMemo(
    () => mappings.sort((a) => (a.id === selectedMappingId ? 1 : -1)),
    [mappings, selectedMappingId],
  );

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    >
      {sortedMappings.map((m) => (
        <MappingLines
          mapping={m}
          onClick={() => setSelectedMapping(m)}
          isSelected={m.id === selectedMappingId}
          key={m.id}
        />
      ))}

      <NodesArc start={'dnd-start'} end={'dnd-target-field'} color={'var(--pf-global--active-color--400)'} />
    </svg>
  );
};

interface IMappingLinesProps {
  mapping: IMapping;
  isSelected: boolean;
  onClick: () => void;
}

const MappingLines: FunctionComponent<IMappingLinesProps> = ({ mapping, isSelected, onClick }) => {
  const { state: isHovered, toggleOn: toggleHoveredOn, toggleOff: toggleHoveredOff } = useToggle(false);

  const handleClick = (event: MouseEvent) => {
    onClick();
    event.stopPropagation();
  };

  const color = isSelected ? 'var(--pf-global--active-color--100)' : undefined;
  const hoverColor = !isSelected ? 'var(--pf-global--active-color--400)' : undefined;
  const mappingLines = mapping.sourceFields.reduce<ReactElement[]>((lines, start) => {
    const linesFromSource = mapping.targetFields.map((end) => (
      <NodesArc
        key={`${start.id}${end.id}`}
        start={`${SOURCES_FIELD_ID_PREFIX}${start.id}`}
        end={`${TARGETS_FIELD_ID_PREFIX}${end.id}`}
        color={isHovered ? hoverColor : color}
        onClick={handleClick}
        onMouseEnter={toggleHoveredOn}
        onMouseLeave={toggleHoveredOff}
        className="arc"
      />
    ));
    return [...lines, ...linesFromSource];
  }, []);
  return <g className="group">{mappingLines}</g>;
};
