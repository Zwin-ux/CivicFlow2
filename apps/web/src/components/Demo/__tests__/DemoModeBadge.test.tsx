import { fireEvent, render, screen } from '@testing-library/react';
import DemoModeBadge from '../DemoModeBadge';
import { useDemoMode } from '@/hooks/useDemoMode';
import type { DemoModeState } from '@/types/demo';

jest.mock('@/hooks/useDemoMode');

const mockUseDemoMode = useDemoMode as jest.MockedFunction<typeof useDemoMode>;

const baseState: DemoModeState = {
  loading: false,
  isDemo: true,
  statusMessage: 'Running in offline showcase mode',
  features: {
    database: 'simulated',
  },
};

describe('DemoModeBadge', () => {
  beforeEach(() => {
    mockUseDemoMode.mockReset();
  });

  it('renders demo status and features when demo mode is active', () => {
    const refresh = jest.fn();
    mockUseDemoMode.mockReturnValue({ state: baseState, refresh });

    render(<DemoModeBadge />);

    expect(screen.getByText('Demo mode active')).toBeInTheDocument();
    expect(screen.getByText(/Running in offline showcase mode/)).toBeInTheDocument();
    expect(screen.getByText(/database/i)).toBeInTheDocument();
  });

  it('calls refresh when the button is clicked', () => {
    const refresh = jest.fn();
    mockUseDemoMode.mockReturnValue({ state: baseState, refresh });

    render(<DemoModeBadge />);

    fireEvent.click(screen.getByRole('button', { name: /refresh/i }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('hides itself when not in demo and no errors are present', () => {
    const refresh = jest.fn();
    const plainState: DemoModeState = {
      loading: false,
      isDemo: false,
    };

    mockUseDemoMode.mockReturnValue({ state: plainState, refresh });

    const { container } = render(<DemoModeBadge />);
    expect(container.firstChild).toBeNull();
  });

  it('shows error details when detection fails', () => {
    const refresh = jest.fn();
    const errorState: DemoModeState = {
      loading: false,
      isDemo: false,
      error: 'Network timeout',
    };

    mockUseDemoMode.mockReturnValue({ state: errorState, refresh });

    render(<DemoModeBadge />);

    expect(screen.getByText(/Unable to confirm demo mode/i)).toHaveTextContent('Network timeout');
  });
});
