import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Widget } from '@/lib/api/generated/model';

const { mutate } = vi.hoisted(() => ({ mutate: vi.fn() }));
vi.mock('@/hooks/use-widgets', () => ({
  useRemoveWidget: () => ({ mutate, isPending: false }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('./ChartWidget', () => ({ ChartWidget: () => <div data-testid="chart-body" /> }));
vi.mock('./TextWidget', () => ({ TextWidget: () => <div data-testid="text-body" /> }));

import { WidgetCard } from './WidgetCard';

const widget: Widget = { id: 'w1', type: 'line', position: 0, title: 'Mentions', text: null };

describe('WidgetCard', () => {
  beforeEach(() => mutate.mockReset());

  it('asks for confirmation before deleting and does not remove on cancel', async () => {
    render(<WidgetCard dashboardKey="k" widget={widget} />);

    await userEvent.click(screen.getByRole('button', { name: /delete widget/i }));
    expect(screen.getByText(/permanently removed/i)).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(mutate).not.toHaveBeenCalled();
  });

  it('removes the widget once the deletion is confirmed', async () => {
    render(<WidgetCard dashboardKey="k" widget={widget} />);

    await userEvent.click(screen.getByRole('button', { name: /delete widget/i }));
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    expect(mutate).toHaveBeenCalledWith({ key: 'k', id: 'w1' }, expect.anything());
  });

  it('opens an expanded view of the widget', async () => {
    render(<WidgetCard dashboardKey="k" widget={widget} />);

    await userEvent.click(screen.getByRole('button', { name: /expand widget/i }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Mentions');
    // the widget body renders both inline and inside the expanded dialog
    expect(screen.getAllByTestId('chart-body').length).toBeGreaterThan(1);
  });
});
