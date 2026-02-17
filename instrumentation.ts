export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return;
  }

  const { bootstrapModuleSdkServer } = await import(
    '@/lib/modules/sdk-server-bootstrap'
  );
  bootstrapModuleSdkServer();
}
