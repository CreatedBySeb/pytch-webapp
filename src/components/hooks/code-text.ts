import { useMemo } from "react";
import { PytchProgram } from "../../model/pytch-program";
import { useStoreState } from "../../store";

export function codeTextEnsuringFlat(
  debugLabel: string,
  program: PytchProgram
): string {
  if (program.kind !== "flat") {
    throw new Error(
      `${debugLabel}: Expected program to be "flat"` +
        ` but is "${program.kind}"`
    );
  }
  return program.text;
}

export function useFlatCodeText(debugLabel: string) {
  return useStoreState((state) => {
    if (
      state.activeProject.project.id === -1 ||
      state.activeProject.syncState.loadState !== "succeeded"
    ) {
      throw new Error(
        `${debugLabel}: Bad state:` +
          ` project id ${state.activeProject.project.id}` +
          `; loadState ${state.activeProject.syncState.loadState}`
      );
    }

    return codeTextEnsuringFlat(
      debugLabel,
      state.activeProject.project.program
    );
  });
}

export function useHasImport(expected: string) {
  const programKind = useStoreState((state) => state.activeProject.project.program.kind);
  const imports = useStoreState((state) => state.activeProject.moduleImports);

  return useMemo(() => {
    if (programKind === "per-method") return true;
    return imports.find(({ module }) => module === expected) !== undefined;
  }, [imports, programKind]);
}
