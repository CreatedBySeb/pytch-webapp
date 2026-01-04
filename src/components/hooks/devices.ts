import { useMemo } from "react";
import { useStoreState } from "../../store";
import { useHasImport } from "./code-text";
import { MICROBIT_IMPORT } from "../../model/devices";

/**
 * A hook which checks if the `pytch.microbit` module is used by the program,
 * but there is no device connected (i.e. a 'missing' device).
 * @returns Whether a device is missing
 */
export function useMissingDevice(): boolean {
  const activeDevice = useStoreState((state) => state.devices.active);

  const usesMicroBit = useStoreState(
    (state) => state.activeProject.usesMicroBit,
  );

  return useMemo(
    () => usesMicroBit && !activeDevice,
    [activeDevice, usesMicroBit],
  );
}

/**
 * A hook which checks if the `pytch.microbit` module is missing in a flat
 * program, but there is a device connected (i.e. the import is 'missing'). For
 * a per-method program, this always returns false since the module will be
 * imported automatically.
 * @returns Whether the `pytch.microbit` import is missing
 */
export function useMissingMicroBitImport(): boolean {
  const activeDevice = useStoreState((state) => state.devices.active);
  const hasImport = useHasImport(MICROBIT_IMPORT.module);

  return useMemo(
    () => activeDevice !== null && hasImport === false,
    [activeDevice, hasImport],
  );
}
