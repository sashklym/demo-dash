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

  it('adds a line chart widget at the default width of one column', async () => {
    render(<AddWidgetMenu dashboardKey="dash-1" />);

    await userEvent.click(screen.getByRole('button', { name: /add widget/i }));
    await userEvent.click(screen.getByText('Line chart'));

    expect(mutate).toHaveBeenCalledWith({ key: 'dash-1', data: { type: 'line', size: 1 } }, expect.anything());
  });

  it('offers all three widget types', async () => {
    render(<AddWidgetMenu dashboardKey="dash-1" />);
    await userEvent.click(screen.getByRole('button', { name: /add widget/i }));

    expect(screen.getByText('Line chart')).toBeInTheDocument();
    expect(screen.getByText('Bar chart')).toBeInTheDocument();
    expect(screen.getByText('Text')).toBeInTheDocument();
  });

  it('offers a width choice, defaulting to one column', async () => {
    render(<AddWidgetMenu dashboardKey="dash-1" />);
    await userEvent.click(screen.getByRole('button', { name: /add widget/i }));

    expect(screen.getByRole('menuitemradio', { name: '1 column' })).toBeChecked();
    expect(screen.getByRole('menuitemradio', { name: '2 columns' })).not.toBeChecked();
    expect(screen.getByRole('menuitemradio', { name: 'Full row' })).not.toBeChecked();
  });

  it('creates the widget at the chosen width', async () => {
    render(<AddWidgetMenu dashboardKey="dash-1" />);
    await userEvent.click(screen.getByRole('button', { name: /add widget/i }));

    // Picking a width must not close the menu — the type click comes next.
    await userEvent.click(screen.getByRole('menuitemradio', { name: 'Full row' }));
    expect(screen.getByText('Bar chart')).toBeInTheDocument();

    await userEvent.click(screen.getByText('Bar chart'));
    expect(mutate).toHaveBeenCalledWith({ key: 'dash-1', data: { type: 'bar', size: 3 } }, expect.anything());
  });
});
