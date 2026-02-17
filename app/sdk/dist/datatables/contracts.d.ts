import type { ModuleTemplatePackEntry } from '../modules/manifest.js';
export type DataTableTemplateSlot = 'table' | 'toolbar' | 'row-actions' | 'create-form' | 'edit-form' | 'delete-action';
export type DataTableTemplateContract = Record<DataTableTemplateSlot, string>;
export type DataTableTemplateEntryFactoryOptions = {
    payloadBySlot?: Partial<Record<DataTableTemplateSlot, Record<string, unknown>>>;
    descriptionBySlot?: Partial<Record<DataTableTemplateSlot, string>>;
    lockTemplateBySlot?: Partial<Record<DataTableTemplateSlot, boolean>>;
};
export declare function createDataTableTemplateContract({ moduleId, resource }: {
    moduleId: string;
    resource: string;
}): DataTableTemplateContract;
export declare function createDataTableTemplateEntries(contract: DataTableTemplateContract, options?: DataTableTemplateEntryFactoryOptions): ModuleTemplatePackEntry[];
