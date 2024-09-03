import { urlWithinApp } from "../../env-utils";

export const welcomeAssetUrl = (basename: string) =>
  urlWithinApp(`/assets/welcome/${basename}`);
