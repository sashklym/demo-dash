import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mutate } = vi.hoisted(() => ({ mutate: vi.fn() }));
vi.mock('@/hooks/use-widgets', () => ({
  useAddWidget: () => ({ mutate, isPending: false }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { AddWidgetMenu } from './AddWidgetMenu';

describe('AddWidgetMenu', () => {
  beforeEach(() => mutate.mockReset());

  it('adds a line chart widget for the current dashboard', async () => {
    render(<AddWidgetMenu dashboardKey="dash-1" />);

    await userEvent.click(screen.getByRole('button', { name: /add widget/i }));
    await userEvent.click(screen.getByText('Line chart'));

    expect(mutate).toHaveBeenCalledWith(
      { key: 'dash-1', data: { type: 'line' } },
      expect.anything(),
    );
  });

  it('offers all three widget types', async () => {
    render(<AddWidgetMenu dashboardKey="dash-1" />);
    await userEvent.click(screen.getByRole('button', { name: /add widget/i }));

    expect(screen.getByText('Line chart')).toBeInTheDocument();
    expect(screen.getByText('Bar chart')).toBeInTheDocument();
    expect(screen.getByText('Text')).toBeInTheDocument();
  });
});
