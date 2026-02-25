import { GeminiFilesValidationError } from './errors';

export type SafetyMode = 'read-only' | 'balanced' | 'unsafe';

export type FileOperation = 'upload' | 'list' | 'get' | 'delete' | 'download';

const SAFETY_MODES: SafetyMode[] = ['read-only', 'balanced', 'unsafe'];

export function isWriteOperation(operation: FileOperation): boolean {
  return operation === 'upload' || operation === 'delete' || operation === 'download';
}

function parseSafetyMode(raw: string | undefined): SafetyMode | undefined {
  if (!raw) {
    return undefined;
  }

  if (SAFETY_MODES.includes(raw as SafetyMode)) {
    return raw as SafetyMode;
  }

  throw new GeminiFilesValidationError(
    `Invalid safety mode: ${raw}. Expected one of: ${SAFETY_MODES.join(', ')}`,
  );
}

export function resolveSafetyMode(input: {
  cliFlag?: string;
  env?: string;
  defaultMode?: SafetyMode;
}): SafetyMode {
  const defaultMode = input.defaultMode ?? 'read-only';
  return parseSafetyMode(input.cliFlag) ?? parseSafetyMode(input.env) ?? defaultMode;
}

export function enforceCliSafety(input: {
  mode: SafetyMode;
  operation: FileOperation;
  forceFlag: boolean;
}): void {
  if (!isWriteOperation(input.operation)) {
    return;
  }

  if (input.mode === 'read-only') {
    throw new GeminiFilesValidationError(
      `Operation ${input.operation} is blocked in read-only safety mode`,
    );
  }

  if (input.mode === 'balanced' && !input.forceFlag) {
    throw new GeminiFilesValidationError(
      `Operation ${input.operation} requires --force in balanced safety mode`,
    );
  }
}

export function enforceMcpSafety(input: {
  mode: SafetyMode;
  operation: FileOperation;
  confirm: boolean;
}): void {
  if (!isWriteOperation(input.operation)) {
    return;
  }

  if (input.mode === 'read-only') {
    throw new GeminiFilesValidationError(
      `Operation ${input.operation} is blocked in read-only safety mode`,
    );
  }

  if (input.mode === 'balanced' && !input.confirm) {
    throw new GeminiFilesValidationError(
      `Operation ${input.operation} requires confirm=true in balanced safety mode`,
    );
  }
}
