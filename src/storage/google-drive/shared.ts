export type TokenInfo = {
  token: string;
  expiration: Date;
};

export type AsyncFile = {
  name(): Promise<string>;
  mimeType(): Promise<string>;
  data(): Promise<ArrayBuffer>;
};

export type GoogleUserInfo = {
  displayName: string;
  emailAddress: string;
};

export type AuthenticationInfo = {
  user: GoogleUserInfo;
  tokenInfo: TokenInfo;
};

export type AcquireTokenOptions = {
  signal: AbortSignal;
};

export type ImportFilesFlow = {
  cancel: () => void;
  files: Promise<Array<AsyncFile>>;
};

export interface GoogleDriveApi {
  /** Acquire an access token for use with future API calls.  To allow
   * external cancellation, the acquisition process listens for the
   * `"abort"` event on the `signal` property of the given `options`. If
   * `"abort"` is raised, the Promise returned by `acquireToken()`
   * rejects. */
  acquireToken(options: AcquireTokenOptions): Promise<TokenInfo>;

  /** Get basic information about the authenticated user. */
  getUserInfo(tokenInfo: TokenInfo): Promise<GoogleUserInfo>;

  /** Allow user to choose a file or some files to import from, using
   * the given `tokenInfo` to authorise.  The returned Promise can
   * reject, for example if the user cancels the operation or if an
   * error occurs. */
  importFiles(tokenInfo: TokenInfo): ImportFilesFlow;

  /** Export the data in the given `file`, using the given `tokenInfo`
   * to authorise. */
  exportFile(tokenInfo: TokenInfo, file: AsyncFile): Promise<void>;
}

export interface GoogleDriveBootApi {
  /** Acquire an API object for Google Drive operations. */
  boot(): Promise<GoogleDriveApi>;
}

export const unknownGoogleUserInfo: GoogleUserInfo = {
  displayName: "unknown user",
  emailAddress: "unknown email address",
};
