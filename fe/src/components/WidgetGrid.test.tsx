import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useWidgets } = vi.hoisted(() => ({ useWidgets: vi.fn() }));
vi.mock('@/hooks/use-widgets', () => ({
  useWidgets,
  useAddWidget: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('./WidgetCard', () => ({
  WidgetCard: ({ widget }: { widget: { title: string } }) => <div data-testid="widget">{widget.title}</div>,
}));

import { WidgetGrid } from './WidgetGrid';

describe('WidgetGrid', () => {
  beforeEach(() => useWidgets.mockReset());

  it('shows skeletons while loading', () => {
    useWidgets.mockReturnValue({ isPending: true });
    const { container } = render(<WidgetGrid dashboardKey="k" />);
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('shows the empty state when there are no widgets', () => {
    useWidgets.mockReturnValue({ isPending: false, isError: false, data: [] });
    render(<WidgetGrid dashboardKey="k" />);
    expect(screen.getByText(/your dashboard is empty/i)).toBeInTheDocument();
  });

  it('renders one card per widget', () => {
    useWidgets.mockReturnValue({
      isPending: false,
      isError: false,
      data: [
        { id: '1', type: 'line', position: 0, title: 'Line A', text: null },
        { id: '2', type: 'text', position: 1, title: 'Notes', text: 'x' },
      ],
    });
    render(<WidgetGrid dashboardKey="k" />);
    expect(screen.getAllByTestId('widget')).toHaveLength(2);
  });

  it('shows an error state with a retry button', () => {
    useWidgets.mockReturnValue({ isPending: false, isError: true, refetch: vi.fn() });
    render(<WidgetGrid dashboardKey="k" />);
    expect(screen.getByText(/couldn.t load widgets/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
