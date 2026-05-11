import { isUnlocked, runEarlyDetection, installUnlockCommand } from '../utils/devtools-detector.js';

beforeEach(() => {
  localStorage.clear();
  // reset window dimensions to defaults (no DevTools simulation)
  Object.defineProperty(window, 'outerWidth',  { writable: true, configurable: true, value: 1024 });
  Object.defineProperty(window, 'outerHeight', { writable: true, configurable: true, value: 768 });
  Object.defineProperty(window, 'innerWidth',  { writable: true, configurable: true, value: 1024 });
  Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 768 });
  delete window.pascomUnlock;
  delete window.pascomLock;
});

describe('isUnlocked', () => {
  it('returns false when localStorage has no flag', () => {
    expect(isUnlocked()).toBe(false);
  });

  it('returns true when localStorage has pascom_dev_unlock=1', () => {
    localStorage.setItem('pascom_dev_unlock', '1');
    expect(isUnlocked()).toBe(true);
  });
});

describe('runEarlyDetection', () => {
  it('returns false when dimensions are equal (no DevTools)', () => {
    expect(runEarlyDetection()).toBe(false);
  });

  it('returns true when outerWidth - innerWidth > 160', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 800 });
    // outerWidth=1024, innerWidth=800 → diff=224 > 160
    expect(runEarlyDetection()).toBe(true);
  });

  it('returns true when outerHeight - innerHeight > 160', () => {
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 550 });
    // outerHeight=768, innerHeight=550 → diff=218 > 160
    expect(runEarlyDetection()).toBe(true);
  });

  it('returns false when unlocked even if dimensions differ', () => {
    localStorage.setItem('pascom_dev_unlock', '1');
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 800 });
    expect(runEarlyDetection()).toBe(false);
  });
});

describe('installUnlockCommand', () => {
  it('defines window.pascomUnlock and window.pascomLock', () => {
    installUnlockCommand();
    expect(typeof window.pascomUnlock).toBe('function');
    expect(typeof window.pascomLock).toBe('function');
  });

  it('pascomUnlock() sets pascom_dev_unlock=1 in localStorage', () => {
    installUnlockCommand();
    window.pascomUnlock();
    expect(localStorage.getItem('pascom_dev_unlock')).toBe('1');
  });

  it('pascomLock() removes pascom_dev_unlock from localStorage', () => {
    localStorage.setItem('pascom_dev_unlock', '1');
    installUnlockCommand();
    window.pascomLock();
    expect(localStorage.getItem('pascom_dev_unlock')).toBeNull();
  });
});
