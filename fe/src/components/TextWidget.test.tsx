import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Widget } from '@/lib/api/generated/model';

const { mutate } = vi.hoisted(() => ({ mutate: vi.fn() }));
vi.mock('@/hooks/use-widgets', () => ({
  useEditWidget: () => ({ mutate, isPending: false }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { TextWidget } from './TextWidget';

const widget: Widget = { id: 'w1', type: 'text', rank: 'a0', title: 'Notes', text: 'hello', period: 'month' };

describe('TextWidget', () => {
  beforeEach(() => mutate.mockReset());

  it('renders the text and enters edit mode with the current value', async () => {
    render(<TextWidget dashboardKey="k" widget={widget} />);
    expect(screen.getByTestId('text-body')).toHaveTextContent('hello');

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    expect(screen.getByLabelText('Widget text')).toHaveValue('hello');
  });

  it('saves an edited value through the API', async () => {
    render(<TextWidget dashboardKey="k" widget={widget} />);
    await userEvent.click(screen.getByRole('button', { name: /edit/i }));

    const textarea = screen.getByLabelText('Widget text');
    await userEvent.clear(textarea);
    await userEvent.type(textarea, 'updated notes');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(mutate).toHaveBeenCalledWith(
      { key: 'k', id: 'w1', data: { text: 'updated notes' } },
      expect.anything(),
    );
  });

  it('shows an empty-state hint when there is no text', () => {
    render(<TextWidget dashboardKey="k" widget={{ ...widget, text: '' }} />);
    expect(screen.getByTestId('text-body')).toHaveTextContent(/empty/i);
  });
});
