export type GeminiFilesErrorCode =
  | 'VALIDATION_ERROR'
  | 'AUTH_ERROR'
  | 'API_ERROR'
  | 'NETWORK_ERROR'
  | 'INTERNAL_ERROR';

export interface GeminiFilesErrorOptions {
  code: GeminiFilesErrorCode;
  message: string;
  retryable: boolean;
  status?: number;
  details?: unknown;
  cause?: unknown;
}

export class GeminiFilesError extends Error {
  public readonly code: GeminiFilesErrorCode;
  public readonly retryable: boolean;
  public readonly status?: number;
  public readonly details?: unknown;
  public readonly cause?: unknown;

  constructor(options: GeminiFilesErrorOptions) {
    super(options.message);
    this.name = 'GeminiFilesError';
    this.code = options.code;
    this.retryable = options.retryable;
    this.status = options.status;
    this.details = options.details;
    this.cause = options.cause;
  }
}

export class GeminiFilesValidationError extends GeminiFilesError {
  constructor(message: string, details?: unknown) {
    super({
      code: 'VALIDATION_ERROR',
      message,
      retryable: false,
      details,
    });
    this.name = 'GeminiFilesValidationError';
  }
}

function isErrorLike(value: unknown): value is Error {
  return value instanceof Error;
}

function maybeNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

function maybeString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function parseStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  const value = error as Record<string, unknown>;
  return maybeNumber(value.status) ?? maybeNumber(value.statusCode) ?? maybeNumber(value.code);
}

function parseMessage(error: unknown): string {
  if (isErrorLike(error) && error.message) {
    return error.message;
  }

  if (error && typeof error === 'object') {
    const value = error as Record<string, unknown>;
    const message = maybeString(value.message);
    if (message) {
      return message;
    }
  }

  return 'Unknown error';
}

export function normalizeGeminiFilesError(error: unknown): GeminiFilesError {
  if (error instanceof GeminiFilesError) {
    return error;
  }

  const status = parseStatus(error);
  const message = parseMessage(error);

  if (status === 401 || status === 403) {
    return new GeminiFilesError({
      code: 'AUTH_ERROR',
      message,
      retryable: false,
      status,
      details: error,
      cause: error,
    });
  }

  if (status !== undefined) {
    return new GeminiFilesError({
      code: 'API_ERROR',
      message,
      retryable: status >= 500 || status === 429,
      status,
      details: error,
      cause: error,
    });
  }

  if (isErrorLike(error)) {
    return new GeminiFilesError({
      code: 'NETWORK_ERROR',
      message,
      retryable: true,
      details: error,
      cause: error,
    });
  }

  return new GeminiFilesError({
    code: 'INTERNAL_ERROR',
    message,
    retryable: false,
    details: error,
    cause: error,
  });
}
