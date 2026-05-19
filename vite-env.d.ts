/// <reference types="vite/client" />

// Vite HMR 类型扩展
interface ImportMeta {
  readonly hot?: {
    readonly data: Record<string, unknown>;
    accept(): void;
    accept(cb: (mod: unknown) => void): void;
    accept(dep: string, cb: (mod: unknown) => void): void;
    accept(deps: readonly string[], cb: (mods: unknown[]) => void): void;
    dispose(cb: (data: Record<string, unknown>) => void): void;
    prune(cb: (data: Record<string, unknown>) => void): void;
    invalidate(message?: string): void;
    on(event: string, cb: (...args: unknown[]) => void): void;
    off(event: string, cb: (...args: unknown[]) => void): void;
    send(event: string, data?: unknown): void;
  };
}
