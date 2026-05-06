import { renderHook, act, waitFor } from '@testing-library/react';

jest.mock('../lib/api', () => ({
  statusPagamento: jest.fn(),
}));

const { statusPagamento } = require('../lib/api');

import { usePollingStatus } from '../hooks/usePollingStatus';

beforeEach(() => {
  jest.useFakeTimers();
  statusPagamento.mockReset();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('usePollingStatus', () => {
  it('does not poll when transactionId is null', () => {
    renderHook(() => usePollingStatus(null));
    jest.advanceTimersByTime(10000);
    expect(statusPagamento).not.toHaveBeenCalled();
  });

  it('polls immediately on mount and every 3 seconds', async () => {
    statusPagamento.mockResolvedValue({ id: 'MP_001', status: 'pending' });
    renderHook(() => usePollingStatus('MP_001'));

    // Initial call on mount
    await act(async () => { await Promise.resolve(); });
    expect(statusPagamento).toHaveBeenCalledTimes(1);

    // After 3 more seconds, another call
    await act(async () => { jest.advanceTimersByTime(3000); });
    await act(async () => { await Promise.resolve(); });
    expect(statusPagamento).toHaveBeenCalledTimes(2);
  });

  it('returns status from API response', async () => {
    statusPagamento.mockResolvedValue({ id: 'MP_001', status: 'pending' });
    const { result } = renderHook(() => usePollingStatus('MP_001'));
    await waitFor(() => expect(result.current.status).toBe('pending'));
  });

  it('stops polling when status becomes approved', async () => {
    statusPagamento.mockResolvedValue({ id: 'MP_001', status: 'approved' });
    const { result } = renderHook(() => usePollingStatus('MP_001'));
    await waitFor(() => expect(result.current.status).toBe('approved'));

    const callCount = statusPagamento.mock.calls.length;
    await act(async () => { jest.advanceTimersByTime(9000); });
    // No further calls after approved
    expect(statusPagamento).toHaveBeenCalledTimes(callCount);
  });

  it('stops polling when status becomes rejected', async () => {
    statusPagamento.mockResolvedValue({ id: 'MP_001', status: 'rejected' });
    const { result } = renderHook(() => usePollingStatus('MP_001'));
    await waitFor(() => expect(result.current.status).toBe('rejected'));

    const callCount = statusPagamento.mock.calls.length;
    await act(async () => { jest.advanceTimersByTime(9000); });
    expect(statusPagamento).toHaveBeenCalledTimes(callCount);
  });
});
