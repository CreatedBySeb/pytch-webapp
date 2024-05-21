export type FileProcessingFailure = {
  fileName: string;
  reason: string;
};

export class FileFailureError extends Error {
  constructor(readonly fileFailures: Array<FileProcessingFailure>) {
    super("There was a problem when processing a file or files");
  }
}
