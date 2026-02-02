/// <reference types="vite/client" />

type Route = {
  path: string;
  element: JSX.Element;
  children?: Route[];
  title?: string;
};

interface ImportMetaEnv {
  readonly ENV_API_BACKEND_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
