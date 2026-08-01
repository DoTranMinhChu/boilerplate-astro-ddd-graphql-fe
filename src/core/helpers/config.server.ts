export function getServerConfig(config: ServerConfig) {
  return process.env[config] || import.meta.env[config];
}
