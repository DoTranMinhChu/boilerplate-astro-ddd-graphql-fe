interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface ImportMetaEnv {
  readonly ASSETS_PREFIX: string | Record<string, string>;
  readonly SITE: string;
}
