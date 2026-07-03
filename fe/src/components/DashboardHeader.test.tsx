import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mutate, navigate } = vi.hoisted(() => ({ mutate: vi.fn(), navigate: vi.fn() }));
vi.mock('react-router-dom', async (orig) => ({
  ...(await orig<typeof import('react-router-dom')>()),
  useNavigate: () => navigate,
}));
vi.mock('@/hooks/use-widgets', () => ({
  useCreateDashboard: () => ({ mutate, isPending: false }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { DashboardHeader } from './DashboardHeader';

describe('DashboardHeader', () => {
  beforeEach(() => {
    mutate.mockReset();
    navigate.mockReset();
  });

  it('shows the current dashboard key', () => {
    render(<DashboardHeader dashboardKey="KEY123" />);
    expect(screen.getByTestId('dashboard-key')).toHaveTextContent('KEY123');
  });

  it('navigates when opening another key', async () => {
    render(<DashboardHeader dashboardKey="KEY123" />);
    await userEvent.type(screen.getByLabelText('Dashboard key'), 'OTHER');
    await userEvent.click(screen.getByRole('button', { name: /open/i }));
    expect(navigate).toHaveBeenCalledWith('/d/OTHER');
  });

  it('copies the key to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<DashboardHeader dashboardKey="KEY123" />);
    await userEvent.click(screen.getByRole('button', { name: /copy key/i }));
    expect(writeText).toHaveBeenCalledWith('KEY123');
  });

  it('creates a new dashboard', async () => {
    render(<DashboardHeader dashboardKey="KEY123" />);
    await userEvent.click(screen.getByRole('button', { name: /new dashboard/i }));
    expect(mutate).toHaveBeenCalled();
  });
});
