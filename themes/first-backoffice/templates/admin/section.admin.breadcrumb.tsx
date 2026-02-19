import type { ReactNode } from 'react';

type TemplateData = {
  title?: string;
};

type TemplateProps = {
  data?: TemplateData;
  className?: string;
  children?: ReactNode;
};

export default function SectionAdminBreadcrumbTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const title = data?.title?.trim() || 'Admin';

  return (
    <div
      className={className}
      data-breadcrumb-title={title}
    >
      {children}
    </div>
  );
}


