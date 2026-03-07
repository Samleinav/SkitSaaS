import { docsSource } from '@/lib/docs-source';
import { getMDXComponents } from '@/mdx-components';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/page';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import type { ComponentType } from 'react';
import type { TOCItemType } from 'fumadocs-core/toc';

type Props = {
  params: Promise<{ slug?: string[] }>;
};

type DocsPageContent = {
  title?: string;
  description?: string;
  body?: ComponentType<{
    components?: ReturnType<typeof getMDXComponents>;
  }>;
  toc?: unknown;
};

export default async function Page({ params }: Props) {
  const { slug } = await params;
  if (!slug || slug.length === 0) redirect('/docs/00-documentation-index');
  const page = docsSource.getPage(slug);
  if (!page) notFound();

  const data = page.data as DocsPageContent;
  const MDX = data.body;
  if (!MDX) notFound();

  return (
    <DocsPage toc={data.toc as TOCItemType[] | undefined}>
      <DocsTitle>{data.title}</DocsTitle>
      <DocsDescription>{data.description}</DocsDescription>
      <DocsBody>
        <MDX
          components={getMDXComponents({
            a: createRelativeLink(docsSource, page),
          })}
        />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return docsSource.generateParams();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = docsSource.getPage(slug);
  if (!page) notFound();

  return {
    title: (page.data as DocsPageContent).title,
    description: (page.data as DocsPageContent).description,
  };
}
