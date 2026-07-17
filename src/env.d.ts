/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE: string | undefined;
  readonly VITE_API_KEY: string | undefined;
  readonly VITE_PCHOME_API_BASE: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
