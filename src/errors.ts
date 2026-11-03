export type NepalDateKitErrorCode =
  | 'OUT_OF_RANGE'
  | 'INVALID_DATE'
  | 'INVALID_DATA'
  | 'PARSE_ERROR';

/** Error raised for invalid dates, dates outside the loaded range, bad data files, and parse failures. */
export class NepalDateKitError extends Error {
  readonly code: NepalDateKitErrorCode;

  constructor(code: NepalDateKitErrorCode, message: string) {
    super(message);
    this.name = 'NepalDateKitError';
    this.code = code;
  }
}
