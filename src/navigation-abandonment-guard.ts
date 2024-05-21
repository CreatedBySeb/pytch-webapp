const kAbandonedError = new Error(
  "the user abandoned the operation by navigating backwards/forwards"
);

export class NavigationAbandonmentGuard {
  exit: () => void;
  abandoned: Promise<void>;
}
