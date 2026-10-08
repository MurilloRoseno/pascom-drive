import { act, render, screen } from '@testing-library/react';
import { hasDevtoolsLikeViewportGap, nextGuardCounters, useDevtoolsGuard } from '../shared/devtoolsGuard.js';

function setViewport({ outerWidth = 1200, innerWidth = 1100, outerHeight = 900, innerHeight = 820 }) {
  Object.defineProperty(window, 'outerWidth', { configurable: true, value: outerWidth });
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: innerWidth });
  Object.defineProperty(window, 'outerHeight', { configurable: true, value: outerHeight });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: innerHeight });
}

function GuardProbe(props) {
  const { isDevtoolsOpen } = useDevtoolsGuard(props);
  return <span>{isDevtoolsOpen ? 'open' : 'closed'}</span>;
}

describe('devtools guard', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    document.body.className = '';
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    setViewport({});
  });

  afterEach(() => {
    jest.useRealTimers();
    document.body.className = '';
  });

  it('detects large viewport gaps only above threshold', () => {
    expect(hasDevtoolsLikeViewportGap({ outerWidth: 1200, innerWidth: 1100, outerHeight: 900, innerHeight: 850 })).toBe(false);
    expect(hasDevtoolsLikeViewportGap({ outerWidth: 1200, innerWidth: 980, outerHeight: 900, innerHeight: 850 })).toBe(true);
  });

  it('requires two open readings and three clean readings', () => {
    let counters = { openCount: 0, closeCount: 0, open: false };
    counters = nextGuardCounters(counters, true);
    expect(counters.open).toBe(false);
    counters = nextGuardCounters(counters, true);
    expect(counters.open).toBe(true);
    counters = nextGuardCounters(counters, false);
    counters = nextGuardCounters(counters, false);
    expect(counters.open).toBe(true);
    counters = nextGuardCounters(counters, false);
    expect(counters.open).toBe(false);
  });

  it('toggles body class in production after confirmed detection and cleanup', () => {
    setViewport({ outerWidth: 1200, innerWidth: 900, outerHeight: 900, innerHeight: 850 });
    render(<GuardProbe production intervalMs={1000} />);
    expect(screen.getByText('closed')).toBeInTheDocument();

    act(() => jest.advanceTimersByTime(1000));
    expect(screen.getByText('open')).toBeInTheDocument();
    expect(document.body).toHaveClass('devtools-open');

    setViewport({ outerWidth: 1200, innerWidth: 1160, outerHeight: 900, innerHeight: 850 });
    act(() => jest.advanceTimersByTime(3000));
    expect(screen.getByText('closed')).toBeInTheDocument();
    expect(document.body).not.toHaveClass('devtools-open');
  });

  it('stays inactive outside production', () => {
    setViewport({ outerWidth: 1200, innerWidth: 900, outerHeight: 900, innerHeight: 850 });
    render(<GuardProbe production={false} intervalMs={1000} />);
    act(() => jest.advanceTimersByTime(3000));
    expect(screen.getByText('closed')).toBeInTheDocument();
    expect(document.body).not.toHaveClass('devtools-open');
  });
});
