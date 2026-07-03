import { Type } from '@sinclair/typebox';

/** Public dashboard shape (the key + title — never the internal id). */
export const DashboardSchema = Type.Object(
  {
    key: Type.String({ description: 'Capability token — open /d/{key} to restore this dashboard' }),
    title: Type.String(),
  },
  { $id: 'Dashboard' },
);

export const CreateDashboardBody = Type.Object(
  {
    title: Type.Optional(
      Type.String({ minLength: 1, maxLength: 120, description: 'Optional title (defaults to "My Dashboard")' }),
    ),
  },
  { $id: 'CreateDashboardBody' },
);

export const DashboardKeyParams = Type.Object({
  key: Type.String({ minLength: 1, description: 'Dashboard key' }),
});
