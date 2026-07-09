type ProcessEnv = Record<string, string>;

type ProcessLike = {
  env: ProcessEnv;
};

const globalScope = globalThis as typeof globalThis & { process?: ProcessLike };

if (!globalScope.process) {
  globalScope.process = { env: {} };
}

if (!globalScope.process.env) {
  globalScope.process.env = {};
}

if (!globalScope.process.env.NODE_ENV) {
  globalScope.process.env.NODE_ENV = import.meta.env.MODE;
}

export {};