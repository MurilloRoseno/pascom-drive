import { render, act } from '@testing-library/react';
import DevToolsBlock from '../components/DevToolsBlock.jsx';

function fireDevToolsEvent(open) {
  act(() => {
    window.dispatchEvent(new CustomEvent('pascom:devtools-detected', { detail: { open } }));
  });
}

describe('DevToolsBlock', () => {
  it('renders nothing by default', () => {
    const { container } = render(<DevToolsBlock />);
    expect(container.firstChild).toBeNull();
  });

  it('renders overlay when pascom:devtools-detected fires with open:true', () => {
    const { container } = render(<DevToolsBlock />);
    fireDevToolsEvent(true);
    expect(container.firstChild).not.toBeNull();
  });

  it('overlay contains pascomUnlock() text', () => {
    const { getByText } = render(<DevToolsBlock />);
    fireDevToolsEvent(true);
    expect(getByText('pascomUnlock()')).toBeTruthy();
  });

  it('hides overlay when pascom:devtools-detected fires with open:false', () => {
    const { container } = render(<DevToolsBlock />);
    fireDevToolsEvent(true);
    expect(container.firstChild).not.toBeNull();
    fireDevToolsEvent(false);
    expect(container.firstChild).toBeNull();
  });
});
