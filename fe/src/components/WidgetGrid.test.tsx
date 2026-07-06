import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Widget } from '@/lib/api/generated/model';

const { useWidgetsPage, useWidgetWindow } = vi.hoisted(() => ({
  useWidgetsPage: vi.fn(),
  useWidgetWindow: vi.fn(),
}));
vi.mock('@/hooks/use-widgets', () => ({
  PAGE_SIZE: 60,
  useWidgetsPage,
  useWidgetWindow,
  useAddWidget: () => ({ mutate: vi.fn(), isPending: false }),
  useReorder: () => ({ mutate: vi.fn(), isPending: false }),
  useMove: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('./WidgetCard', () => ({
  WidgetCard: ({ widget }: { widget: { title: string } }) => <div data-testid="widget">{widget.title}</div>,
}));

import { WidgetGrid } from './WidgetGrid';

const widget = (i: number): Widget => ({
  id: String(i),
  type: 'line',
  rank: `a${i}`,
  title: `W${i}`,
  text: null,
  period: 'month',
});

/** A resolved first-page query result. */
const page = (items: Widget[], total = items.length) => ({
  isPending: false,
  isError: false,
  data: { items, total, offset: 0, limit: 60 },
});

describe('WidgetGrid', () => {
  beforeEach(() => {
    useWidgetsPage.mockReset();
    // By default the virtual grid can resolve every index (tests that need it override).
    useWidgetWindow.mockImplementation(() => {
      const map = new Map<number, Widget>();
      for (let i = 0; i < 1000; i++) map.set(i, widget(i));
      return map;
    });
  });

  it('shows skeletons while loading', () => {
    useWidgetsPage.mockReturnValue({ isPending: true });
    const { container } = render(<WidgetGrid dashboardKey="k" />);
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('shows the empty state when there are no widgets', () => {
    useWidgetsPage.mockReturnValue(page([], 0));
    render(<WidgetGrid dashboardKey="k" />);
    expect(screen.getByText(/your dashboard is empty/i)).toBeInTheDocument();
  });

  it('renders one card per widget', () => {
    useWidgetsPage.mockReturnValue(page([widget(1), widget(2)]));
    render(<WidgetGrid dashboardKey="k" />);
    expect(screen.getAllByTestId('widget')).toHaveLength(2);
  });

  it('virtualizes large dashboards — renders far fewer cards than the total', () => {
    const items = Array.from({ length: 60 }, (_, i) => widget(i));
    useWidgetsPage.mockReturnValue(page(items, 300));
    render(<WidgetGrid dashboardKey="k" />);
    const rendered = screen.getAllByTestId('widget');
    expect(rendered.length).toBeGreaterThan(0);
    expect(rendered.length).toBeLessThan(300);
  });

  it('shows an error state with a retry button', () => {
    useWidgetsPage.mockReturnValue({ isPending: false, isError: true, refetch: vi.fn() });
    render(<WidgetGrid dashboardKey="k" />);
    expect(screen.getByText(/couldn.t load widgets/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
