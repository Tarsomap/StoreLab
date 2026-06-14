import "reflect-metadata";
import { EngineModule } from "../engine/engine.module";
import { AssistantModule } from "./assistant.module";

type ModuleRef = unknown;

/**
 * Resolve uma entrada da lista `imports` para a classe de módulo e, no caso de
 * módulos dinâmicos (ex.: `JwtModule.register(...)`), também os imports que ele
 * carrega em runtime. Cobre `forwardRef(() => Module)`, `DynamicModule` e a
 * classe de módulo pura.
 */
function unwrap(
  entry: ModuleRef,
): { moduleClass: unknown; dynamicImports: ModuleRef[] } | null {
  if (entry && typeof entry === "object" && "forwardRef" in entry) {
    const fn = (entry as { forwardRef: () => unknown }).forwardRef;
    return { moduleClass: fn(), dynamicImports: [] };
  }

  if (entry && typeof entry === "object" && "module" in entry) {
    const dyn = entry as { module: unknown; imports?: ModuleRef[] };
    return { moduleClass: dyn.module, dynamicImports: dyn.imports ?? [] };
  }

  if (typeof entry === "function") {
    return { moduleClass: entry, dynamicImports: [] };
  }

  return null;
}

/**
 * Percorre a árvore de dependências (imports estáticos + dinâmicos) a partir de
 * um módulo raiz, retornando todas as classes de módulo alcançáveis.
 */
function collectModules(root: ModuleRef): Set<unknown> {
  const visited = new Set<unknown>();
  const queue: ModuleRef[] = [root];

  while (queue.length > 0) {
    const unwrapped = unwrap(queue.shift());
    if (!unwrapped) continue;

    const { moduleClass, dynamicImports } = unwrapped;
    for (const imported of dynamicImports) queue.push(imported);

    if (!moduleClass || visited.has(moduleClass)) continue;
    visited.add(moduleClass);

    const staticImports =
      (Reflect.getMetadata("imports", moduleClass as object) as
        | ModuleRef[]
        | undefined) ?? [];
    for (const imported of staticImports) queue.push(imported);
  }

  return visited;
}

describe("AssistantModule (fronteira anti-recálculo)", () => {
  it("não tem o EngineModule em nenhum ponto da árvore de dependências", () => {
    const modules = collectModules(AssistantModule);

    expect(modules.has(AssistantModule)).toBe(true);
    expect(modules.has(EngineModule)).toBe(false);
  });

  it("importa diretamente apenas AuthModule e ResultsModule", () => {
    const directImports =
      (Reflect.getMetadata("imports", AssistantModule) as unknown[]) ?? [];
    const names = directImports.map((module) =>
      typeof module === "function" ? module.name : String(module),
    );

    expect(names).toEqual(
      expect.arrayContaining(["AuthModule", "ResultsModule"]),
    );
    expect(names).not.toContain("EngineModule");
  });
});
