import { AsyncLocalStorage } from "node:async_hooks";
import type { Database } from "./storage";
export type RuntimeEnv = {
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  OPENAI_EMBEDDING_MODEL?: string;
  PUBLIC_SHOWCASE_MODE?: string;
  AIMATCH_ACCESS_TOKEN?: string;
  DB?: Database;
};
const runtime = new AsyncLocalStorage<RuntimeEnv>();
export function withRuntimeEnv<T>(env: RuntimeEnv, run: () => T): T {
  return runtime.run(env, run);
}
export function getRuntimeEnv(): RuntimeEnv {
  const env = runtime.getStore();
  return {
    OPENAI_API_KEY: env?.OPENAI_API_KEY ?? process.env.OPENAI_API_KEY,
    OPENAI_MODEL: env?.OPENAI_MODEL ?? process.env.OPENAI_MODEL,
    OPENAI_EMBEDDING_MODEL:
      env?.OPENAI_EMBEDDING_MODEL ?? process.env.OPENAI_EMBEDDING_MODEL,
    PUBLIC_SHOWCASE_MODE:
      env?.PUBLIC_SHOWCASE_MODE ?? process.env.PUBLIC_SHOWCASE_MODE,
    AIMATCH_ACCESS_TOKEN:
      env?.AIMATCH_ACCESS_TOKEN ?? process.env.AIMATCH_ACCESS_TOKEN,
    DB: env?.DB,
  };
}
