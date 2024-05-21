import { promiseAndResolve } from "./utils";

const kAbandonedError = new Error(
  "the user abandoned the operation by navigating backwards/forwards"
);

export class NavigationAbandonmentGuard {
  exit: () => void;
  abandoned: Promise<void>;

  constructor() {
    const { promise, resolve } = promiseAndResolve();
    this.abandoned = promise;

    window.addEventListener("popstate", resolve);
    this.exit = () => window.removeEventListener("popstate", resolve);
  }
}
