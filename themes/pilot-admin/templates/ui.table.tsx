import { useThemeMessages } from '@skitsaas/sdk';

/**
 * Code-driven template for ui.table — Pilot Admin theme.
 *
 * This is a demonstration of how a theme can completely replace
 * the default table component with its own implementation.
 * The component receives `data` with `columns` and `rows` and
 * renders a custom styled table.
 */
export default function PilotTable({
    data,
    className,
    themeId
}: {
    data?: {
        columns?: Array<{ header: string; accessorKey: string }>;
        rows?: Array<Record<string, unknown>>;
    };
    className?: string;
    themeId?: string;
}) {
    const t = useThemeMessages(themeId) as any;
    const messages = t.admin?.pilotTable ?? {};

    const columns = data?.columns ?? [];
    const rows = data?.rows ?? [];

    return (
        <div className={className} style={{
            border: '1px solid var(--pilot-primary, #1976d2)',
            borderRadius: '12px',
            overflow: 'hidden',
            background: 'var(--pilot-surface, #1e1e1e)',
        }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <caption style={{
                    captionSide: 'top',
                    textAlign: 'left',
                    padding: '8px 16px',
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: '0.8rem',
                    fontStyle: 'italic'
                }}>
                    {messages.title}
                </caption>
                <thead>
                    <tr style={{
                        background: 'var(--pilot-primary, #1976d2)',
                        color: '#fff',
                    }}>
                        {columns.map((col) => (
                            <th
                                key={col.accessorKey}
                                style={{
                                    padding: '12px 16px',
                                    textAlign: 'left',
                                    fontWeight: 600,
                                    fontSize: '0.875rem',
                                    letterSpacing: '0.025em',
                                }}
                            >
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, rowIndex) => (
                        <tr
                            key={rowIndex}
                            style={{
                                borderBottom: '1px solid rgba(255,255,255,0.08)',
                                transition: 'background 0.15s',
                            }}
                            onMouseEnter={(e) => {
                                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
                            }}
                            onMouseLeave={(e) => {
                                (e.currentTarget as HTMLElement).style.background = 'transparent';
                            }}
                        >
                            {columns.map((col) => (
                                <td
                                    key={col.accessorKey}
                                    style={{
                                        padding: '10px 16px',
                                        fontSize: '0.875rem',
                                        color: 'var(--pilot-text, #e0e0e0)',
                                    }}
                                >
                                    {String(row[col.accessorKey] ?? '')}
                                </td>
                            ))}
                        </tr>
                    ))}
                    {rows.length === 0 && (
                        <tr>
                            <td
                                colSpan={columns.length || 1}
                                style={{
                                    padding: '24px 16px',
                                    textAlign: 'center',
                                    color: 'rgba(255,255,255,0.4)',
                                    fontSize: '0.875rem',
                                }}
                            >
                                {messages.noData ?? 'No data available'}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
