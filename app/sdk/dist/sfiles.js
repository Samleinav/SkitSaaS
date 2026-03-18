// ─── Backend & Visibility ────────────────────────────────────────────────────
// ─── Service locator ─────────────────────────────────────────────────────────
// The host app calls registerSfiles() once (lib/sfiles/index.ts).
// Modules import { sfiles } from '@skitsaas/sdk/sfiles' and use it directly.
let _instance = null;
function readRegisteredSfiles() {
    if (!_instance) {
        throw new Error('[Sfiles] Not initialized. Ensure the host loads lib/sfiles before ' +
            'using @skitsaas/sdk/sfiles.');
    }
    return _instance;
}
/**
 * Register the Sfiles singleton. Called once by the host app in lib/sfiles/index.ts.
 */
export function registerSfiles(instance) {
    _instance = instance;
}
/**
 * Bind a resolved actor context to the public manager so callers no longer
 * repeat the actor parameter on every operation.
 */
export function bindSfilesActor(actor, manager = readRegisteredSfiles()) {
    return {
        upload(file, filename, options) {
            return manager.upload(file, filename, options, actor);
        },
        list(options) {
            return manager.list(actor, options);
        },
        get(id) {
            return manager.get(actor, id);
        },
        read(id) {
            return manager.read(actor, id);
        },
        delete(id) {
            return manager.delete(actor, id);
        },
        search(options) {
            return manager.search(actor, options);
        },
        rename(id, options) {
            return manager.rename(actor, id, options);
        },
        move(id, options) {
            return manager.move(actor, id, options);
        },
        getUrl(id, options) {
            return manager.getUrl(actor, id, options);
        },
        zip(options) {
            return manager.zip(actor, options);
        },
        setPermissions(fileId, options) {
            return manager.setPermissions(actor, fileId, options);
        },
        getPermissions(fileId) {
            return manager.getPermissions(actor, fileId);
        }
    };
}
/**
 * Sfiles singleton — import and use directly from any module or server-side code.
 * The host must have imported lib/sfiles before any method is called.
 *
 * @example
 * import { sfiles } from '@skitsaas/sdk/sfiles';
 * await sfiles.upload(buffer, 'file.pdf', { folder: '/docs/' }, actor);
 */
export const sfiles = new Proxy({}, {
    get(_target, prop) {
        return readRegisteredSfiles()[prop];
    },
});
