import { GeminiFilesError, GeminiFilesValidationError } from '@typescript-template/common';

import type { StructuredToolError } from './types';

export function mapToolError(error: unknown): StructuredToolError {
  if (error instanceof GeminiFilesValidationError) {
    return {
      code: 'VALIDATION_ERROR',
      message: error.message,
      retryable: false,
      details: error.details,
    };
  }

  if (error instanceof GeminiFilesError) {
    return {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
      details:
        error.status !== undefined
          ? { status: error.status, details: error.details }
          : error.details,
    };
  }

  if (error instanceof Error) {
    return {
      code: 'INTERNAL_ERROR',
      message: error.message,
      retryable: false,
    };
  }

  return {
    code: 'INTERNAL_ERROR',
    message: 'Unknown error',
    retryable: false,
  };
}
