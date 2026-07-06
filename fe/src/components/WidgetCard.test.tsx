import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Widget } from '@/lib/api/generated/model';

const { remove, edit } = vi.hoisted(() => ({ remove: vi.fn(), edit: vi.fn() }));
vi.mock('@/hooks/use-widgets', () => ({
  useRemoveWidget: () => ({ mutate: remove, isPending: false }),
  useEditWidget: () => ({ mutate: edit, isPending: false }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('./ChartWidget', () => ({ ChartWidget: () => <div data-testid="chart-body" /> }));
vi.mock('./TextWidget', () => ({ TextWidget: () => <div data-testid="text-body" /> }));

import { WidgetCard } from './WidgetCard';

const widget: Widget = { id: 'w1', type: 'line', rank: 'a0', title: 'Mentions', text: null, period: 'month' };

describe('WidgetCard', () => {
  beforeEach(() => {
    remove.mockReset();
    edit.mockReset();
  });

  it('always shows the widget type alongside its name', () => {
    render(<WidgetCard dashboardKey="k" widget={widget} />);
    expect(screen.getByText('Line')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mentions/i })).toBeInTheDocument();
  });

  it('renames the widget to a custom name', async () => {
    render(<WidgetCard dashboardKey="k" widget={widget} />);

    await userEvent.click(screen.getByRole('button', { name: /mentions/i }));
    const field = screen.getByLabelText('Widget name');
    await userEvent.clear(field);
    await userEvent.type(field, 'Brand buzz{Enter}');

    expect(edit).toHaveBeenCalledWith(
      { key: 'k', id: 'w1', data: { title: 'Brand buzz' } },
      expect.anything(),
    );
  });

  it('asks for confirmation before deleting and does not remove on cancel', async () => {
    render(<WidgetCard dashboardKey="k" widget={widget} />);

    await userEvent.click(screen.getByRole('button', { name: /delete widget/i }));
    expect(screen.getByText(/permanently removed/i)).toBeInTheDocument();
    expect(remove).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(remove).not.toHaveBeenCalled();
  });

  it('removes the widget once the deletion is confirmed', async () => {
    render(<WidgetCard dashboardKey="k" widget={widget} />);

    await userEvent.click(screen.getByRole('button', { name: /delete widget/i }));
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    expect(remove).toHaveBeenCalledWith({ key: 'k', id: 'w1' }, expect.anything());
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
