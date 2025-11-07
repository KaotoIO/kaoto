export type NonStringEIP<T> = T extends string ? never : T;
