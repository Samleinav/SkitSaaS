import type { CommerceProductsModuleTemplateProps } from './template-types';

export default function SectionAdminProductsFormTemplate({
  children
}: CommerceProductsModuleTemplateProps) {
  return <section className="rounded-xl border border-zinc-200 bg-white p-5">{children}</section>;
}
