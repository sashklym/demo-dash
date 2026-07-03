import { Type } from '@sinclair/typebox';

/** Shared error response contract — referenced by every error status in the API. */
export const ErrorSchema = Type.Object(
  {
    statusCode: Type.Integer(),
    error: Type.String(),
    message: Type.String(),
  },
  {
    $id: 'Error',
    // Keep extra fields (e.g. validation `details`) instead of stripping them on serialize.
    additionalProperties: true,
  },
);
