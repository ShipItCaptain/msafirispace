import { act } from 'react';
import { createRoot } from 'react-dom/client';

export const createDomTestHarness = () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  const render = (node) => {
    act(() => {
      root.render(node);
    });
  };

  const flush = async () => {
    await act(async () => {
      await Promise.resolve();
    });
  };

  const settle = async (cycles = 4) => {
    for (let i = 0; i < cycles; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await flush();
    }
  };

  const waitForCondition = async (condition, timeout = 4000) => {
    const start = Date.now();
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (condition()) return;
      if (Date.now() - start > timeout) {
        throw new Error('Timed out waiting for condition');
      }
      // eslint-disable-next-line no-await-in-loop
      await flush();
    }
  };

  const click = (element) => {
    act(() => {
      element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  };

  const unmount = async () => {
    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    document.body.removeChild(container);
  };

  return {
    container,
    root,
    render,
    flush,
    settle,
    waitForCondition,
    click,
    unmount,
  };
};

export const setInputValue = (input, value) => {
  act(() => {
    const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
    descriptor.set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
};
