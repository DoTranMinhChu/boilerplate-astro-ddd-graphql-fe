// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../.astro/types.d.ts" />

import type { PublicConfig, SecretConfig } from './env.config';
declare global {
  type ClientConfig = `${PublicConfig}`;
  type ServerConfig = `${PublicConfig}` | `${SecretConfig}`;
  namespace App {
    interface Locals {
      isDashboard: boolean;
    }
  }
}

export {};
