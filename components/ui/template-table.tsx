import type { TemplateArea } from '@/lib/templates/controller';
import { resolveUiTableTemplateForArea } from '@/lib/templates/ui-table';
import { cn } from '@/lib/utils';
import { Table, type TableProps } from '@/components/ui/table';

type TemplateTableProps = Omit<
  TableProps,
  'templateId' | 'templateSource' | 'templateComponentId'
> & {
  area: TemplateArea;
  route?: string | null;
  themeId?: string | null;
  moduleId?: string | null;
  data?: unknown;
};

export async function TemplateTable({
  area,
  route = null,
  themeId = null,
  moduleId = null,
  data,
  className,
  containerClassName,
  ...props
}: TemplateTableProps) {
  const template = await resolveUiTableTemplateForArea({
    area,
    route,
    themeId,
    moduleId,
    data
  });

  return (
    <Table
      className={cn(template.payload.tableClassName, className)}
      containerClassName={cn(
        template.payload.containerClassName,
        containerClassName
      )}
      templateComponentId="ui.table"
      templateId={template.templateId}
      templateSource={template.source}
      {...props}
    />
  );
}

