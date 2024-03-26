type EveryConjunctResizedHandler = () => void;

/** Work with a conjunction of `ResizeObserver` instances, and an array
 * of handlers which must be called when every contributing
 * resize-observer has fired.  Once the handlers have been called, the
 * `ConjoinedResizeObserver` is no longer `enabled` and will not call
 * the handlers again.
 *
 * The motivating case is the `Junior-CodeEditor` containing a
 * collection of `PytchScriptEditor` instances, and we want to scroll a
 * particular line of a particular `PytchScriptEditor` into view.  Ace
 * goes through various phases of constructing the editor, one of which
 * involves resizing the editor to hold the correct number of text
 * lines.  We can only correctly scroll once every `PytchScriptEditor`
 * instance in the CodeEditor has its final size.
 * */
export class ConjoinedResizeObserver {
  awaitedConjunctIds: Set<string>;
  everyConjunctResizedHandlers: Array<EveryConjunctResizedHandler>;
  enabled: boolean;

  constructor(conjunctIds: Array<string>) {
    this.awaitedConjunctIds = new Set<string>(conjunctIds);
    this.everyConjunctResizedHandlers = [];
    this.enabled = true;
  }

  acceptConjunctResizeEvent(conjunctId: string) {
    if (!this.enabled) return;

    const wasDeleted = this.awaitedConjunctIds.delete(conjunctId);
    if (!wasDeleted) {
      console.warn(`conjunct "${conjunctId}" not found`);
    }

    if (this.enabled && this.awaitedConjunctIds.size === 0) {
      this.everyConjunctResizedHandlers.forEach((handler) => handler());
      this.enabled = false;
    }
  }

  addAllResizedHandler(handler: EveryConjunctResizedHandler) {
    this.everyConjunctResizedHandlers.push(handler);
  }

  disconnect() {
    this.awaitedConjunctIds.clear();
    this.everyConjunctResizedHandlers = [];
    this.enabled = false;
  }
}
