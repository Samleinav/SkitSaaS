import type { CommerceProductsModuleTemplateProps } from './template-types';

export default function SectionAdminProductsTableTemplate({
  children
}: CommerceProductsModuleTemplateProps) {
  return <section className="rounded-xl border border-zinc-200 bg-white p-4">{children}</section>;
}
