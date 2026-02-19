import type { ReactNode } from 'react';

type TemplateData = {
  section?: string;
};

type TemplateProps = {
  data?: TemplateData;
  className?: string;
  children?: ReactNode;
};

export default function SectionAdminAppConfigNavTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const section = data?.section?.trim() || 'app-config';

  return (
    <div
      className={className}
      data-admin-section={section}
    >
      {children}
    </div>
  );
}


