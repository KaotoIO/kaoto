import React,{useState} from 'react';
import { Pagination } from '@patternfly/react-core';

export interface PaginationProperties {
    itemCount: number;
    perPage: number;
    pageChangeCallback: any
};

function PaginationTop({ itemCount, perPage, pageChangeCallback }: PaginationProperties) {
    const [page, setPage] = useState(1);
    
    const onSetPage = (_event: React.MouseEvent | React.KeyboardEvent | MouseEvent, newPage: number) => {
        setPage(newPage);
        pageChangeCallback(newPage);
    };

    const onPerPageSelect = (
        _event: React.MouseEvent | React.KeyboardEvent | MouseEvent,
        newPerPage: number,
        newPage: number
    ) => {
        setPage(newPage);
    };

    return (
        <Pagination
            itemCount={itemCount}
            perPage={perPage}
            page={page}
            onSetPage={onSetPage}
            widgetId="top-example"
            perPageOptions={[ { title: '10', value: 10 }]}
            ouiaId="PaginationTop"/>
    );
};

export default PaginationTop;