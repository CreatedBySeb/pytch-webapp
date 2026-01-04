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

/**
 * A memoised hook which checks if the program has a specific import
 * @param expected The name of the module that is expected to be imported
 * @returns A boolean for flat programs if the import is included, or null for
 *  per-method programs as it is not applicable
 */
export function useHasImport(expected: string): boolean | null {
  const programKind = useStoreState(
    (state) => state.activeProject.project.program.kind,
  );

  const imports = useStoreState((state) => state.activeProject.moduleImports);

  return useMemo(() => {
    if (programKind === "per-method") return null;
    return imports.find(({ module }) => module === expected) !== undefined;
  }, [imports, programKind]);
}
