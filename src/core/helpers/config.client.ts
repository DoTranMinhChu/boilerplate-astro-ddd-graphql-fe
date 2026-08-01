export function getClientConfig(config: ClientConfig): string {
  return (
    (window as any).config?.[config] ||
    (config.startsWith('PUBLIC_')
      ? import.meta.env[config]
      : import.meta.env[`PUBLIC_${config}`])
  );
}
