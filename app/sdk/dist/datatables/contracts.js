function normalizeSegment(value) {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9.-]+/g, '-')
        .replace(/-{2,}/g, '-')
        .replace(/^-+|-+$/g, '');
}
function assertNonEmptySegment(value, label) {
    if (!value) {
        throw new Error(`[sdk-datatable] ${label} is required to build template component ids.`);
    }
}
function buildComponentId({ moduleId, resource, slot }) {
    const normalizedModuleId = normalizeSegment(moduleId);
    const normalizedResource = normalizeSegment(resource);
    const normalizedSlot = normalizeSegment(slot);
    assertNonEmptySegment(normalizedModuleId, 'moduleId');
    assertNonEmptySegment(normalizedResource, 'resource');
    assertNonEmptySegment(normalizedSlot, 'slot');
    return `${normalizedModuleId}.datatable.${normalizedResource}.${normalizedSlot}`;
}
export function createDataTableTemplateContract({ moduleId, resource }) {
    return {
        table: buildComponentId({
            moduleId,
            resource,
            slot: 'table'
        }),
        toolbar: buildComponentId({
            moduleId,
            resource,
            slot: 'toolbar'
        }),
        'row-actions': buildComponentId({
            moduleId,
            resource,
            slot: 'row-actions'
        }),
        'create-form': buildComponentId({
            moduleId,
            resource,
            slot: 'create-form'
        }),
        'edit-form': buildComponentId({
            moduleId,
            resource,
            slot: 'edit-form'
        }),
        'delete-action': buildComponentId({
            moduleId,
            resource,
            slot: 'delete-action'
        })
    };
}
export function createDataTableTemplateEntries(contract, options = {}) {
    const slots = Object.keys(contract);
    return slots.map((slot) => {
        const componentId = contract[slot];
        const description = options.descriptionBySlot?.[slot] ??
            `Datatable template slot "${slot}"`;
        const payload = options.payloadBySlot?.[slot];
        const lockTemplate = options.lockTemplateBySlot?.[slot] === true;
        return {
            componentId,
            description,
            ...(payload ? { payload } : {}),
            ...(lockTemplate ? { lockTemplate: true } : {})
        };
    });
}
