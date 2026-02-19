type TemplateDebugMetadataInput = {
  componentId?: string | null;
  templateId?: string | null;
  templateSource?: string | null;
};

export function isTemplateDebugMetadataEnabled() {
  return (
    process.env.NODE_ENV === 'development' ||
    process.env.NEXT_PUBLIC_TEMPLATE_DEBUG_METADATA === '1'
  );
}

export function getTemplateDebugMetadataAttributes({
  componentId,
  templateId,
  templateSource
}: TemplateDebugMetadataInput) {
  if (!isTemplateDebugMetadataEnabled()) {
    return {};
  }

  return {
    'data-template-component': componentId || undefined,
    'data-template-id': templateId || undefined,
    'data-template-source': templateSource || undefined
  };
}
