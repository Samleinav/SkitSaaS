// ─── Backend & Visibility ────────────────────────────────────────────────────
// ─── Service locator ─────────────────────────────────────────────────────────
// The host app calls registerSfiles() once (lib/sfiles/index.ts).
// Modules import { sfiles } from '@skitsaas/sdk/sfiles' and use it directly.
let _instance = null;
/**
 * Register the Sfiles singleton. Called once by the host app in lib/sfiles/index.ts.
 */
export function registerSfiles(instance) {
    _instance = instance;
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
        if (!_instance) {
            throw new Error(`[Sfiles] Not initialized — cannot call sfiles.${prop}(). ` +
                'Ensure lib/sfiles is loaded before using sfiles from the SDK.');
        }
        return _instance[prop];
    },
});
