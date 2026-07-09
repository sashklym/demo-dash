import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Widget } from '@/lib/api/generated/model';

const { useWidgetChunk, useWidgetRowWindow } = vi.hoisted(() => ({
  useWidgetChunk: vi.fn(),
  useWidgetRowWindow: vi.fn(),
}));
vi.mock('@/hooks/use-widgets', () => ({
  CHUNK_ROWS: 20,
  useWidgetChunk,
  useWidgetRowWindow,
  useAddWidget: () => ({ mutate: vi.fn(), isPending: false }),
  useReorder: () => ({ mutate: vi.fn(), isPending: false }),
  usePlace: () => ({ mutate: vi.fn(), isPending: false }),
  useEditWidget: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('./WidgetCard', () => ({
  WidgetCard: ({ widget }: { widget: { title: string } }) => <div data-testid="widget">{widget.title}</div>,
}));

import { WidgetGrid } from './WidgetGrid';

/** A size-1 widget at a given reading position, three to a row. */
const widget = (i: number, over: Partial<Widget> = {}): Widget => ({
  id: String(i),
  type: 'line',
  row: Math.floor(i / 3),
  col: i % 3,
  size: 1,
  title: `W${i}`,
  text: null,
  period: 'month',
  ...over,
});

/** A resolved chunk-0 query result. */
const chunk = (items: Widget[], total = items.length, totalRows = Math.ceil(total / 3)) => ({
  isPending: false,
  isError: false,
  data: { items, total, totalRows, fromRow: 0, toRow: 19 },
});

describe('WidgetGrid', () => {
  beforeEach(() => {
    useWidgetChunk.mockReset();
    // By default the virtual grid can resolve every row (tests that need it override).
    useWidgetRowWindow.mockImplementation(() => {
      const byRow = new Map<number, Widget[]>();
      for (let i = 0; i < 3000; i++) {
        const w = widget(i);
        const row = byRow.get(w.row);
        if (row) row.push(w);
        else byRow.set(w.row, [w]);
      }
      return byRow;
    });
  });

  it('shows skeletons while loading', () => {
    useWidgetChunk.mockReturnValue({ isPending: true });
    const { container } = render(<WidgetGrid dashboardKey="k" />);
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('shows the empty state when there are no widgets', () => {
    useWidgetChunk.mockReturnValue(chunk([], 0, 0));
    render(<WidgetGrid dashboardKey="k" />);
    expect(screen.getByText(/your dashboard is empty/i)).toBeInTheDocument();
  });

  it('renders one card per widget', () => {
    useWidgetChunk.mockReturnValue(chunk([widget(0), widget(1)]));
    render(<WidgetGrid dashboardKey="k" />);
    expect(screen.getAllByTestId('widget')).toHaveLength(2);
  });

  it('virtualizes boards past the row threshold — renders far fewer cards than the total', () => {
    const items = Array.from({ length: 60 }, (_, i) => widget(i));
    useWidgetChunk.mockReturnValue(chunk(items, 900, 300));
    render(<WidgetGrid dashboardKey="k" />);
    const rendered = screen.getAllByTestId('widget');
    expect(rendered.length).toBeGreaterThan(0);
    expect(rendered.length).toBeLessThan(900);
  });

  it('keeps the draggable grid at exactly the row threshold', () => {
    const items = Array.from({ length: 60 }, (_, i) => widget(i));
    useWidgetChunk.mockReturnValue(chunk(items, 60, 20));
    render(<WidgetGrid dashboardKey="k" />);
    // Not virtualized: every widget in chunk 0 is mounted.
    expect(screen.getAllByTestId('widget')).toHaveLength(60);
  });

  it('shows an error state with a retry button', () => {
    useWidgetChunk.mockReturnValue({ isPending: false, isError: true, refetch: vi.fn() });
    render(<WidgetGrid dashboardKey="k" />);
    expect(screen.getByText(/couldn.t load widgets/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
