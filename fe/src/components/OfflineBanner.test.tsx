import { render, screen } from '@testing-library/react';
import { onlineManager } from '@tanstack/react-query';
import { afterEach, describe, expect, it } from 'vitest';
import { OfflineBanner } from './OfflineBanner';

describe('OfflineBanner', () => {
  afterEach(() => onlineManager.setOnline(true));

  it('renders nothing while online', () => {
    onlineManager.setOnline(true);
    const { container } = render(<OfflineBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows an offline alert while offline', () => {
    onlineManager.setOnline(false);
    render(<OfflineBanner />);
    expect(screen.getByRole('alert')).toHaveTextContent(/offline/i);
  });
});
