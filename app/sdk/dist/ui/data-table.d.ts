import * as React from 'react';
import { type SdkDataTableProps } from './data-table-contract.js';
export declare function DataTable<TItem extends Record<string, unknown>>(props: SdkDataTableProps<TItem>): string | number | bigint | boolean | Iterable<React.ReactNode> | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | import("react/jsx-runtime").JSX.Element;
