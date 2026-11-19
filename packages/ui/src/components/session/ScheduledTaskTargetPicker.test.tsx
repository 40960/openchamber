import React, { act } from 'react';
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';

const dom = new Window({ url: 'http://localhost' });
const originals = new Map<string, PropertyDescriptor | undefined>();

beforeAll(() => {
  const globals = {
    window: dom,
    document: dom.document,
    navigator: dom.navigator,
    location: dom.location,
    localStorage: dom.localStorage,
    Element: dom.Element,
    HTMLElement: dom.HTMLElement,
    HTMLInputElement: dom.HTMLInputElement,
    Node: dom.Node,
    Event: dom.Event,
    CustomEvent: dom.CustomEvent,
    KeyboardEvent: dom.KeyboardEvent,
    MouseEvent: dom.MouseEvent,
    PointerEvent: dom.PointerEvent,
    MutationObserver: dom.MutationObserver,
    ResizeObserver: dom.ResizeObserver,
    getComputedStyle: dom.getComputedStyle.bind(dom),
    requestAnimationFrame: dom.requestAnimationFrame.bind(dom),
    cancelAnimationFrame: dom.cancelAnimationFrame.bind(dom),
    IS_REACT_ACT_ENVIRONMENT: true,
  };
  for (const [name, value] of Object.entries(globals)) {
    originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  }
});

afterAll(() => {
  dom.close();
  for (const [name, descriptor] of originals) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else Reflect.deleteProperty(globalThis, name);
  }
});

const renderTrigger = async (isMobile: boolean) => {
  const { createRoot } = await import('react-dom/client');
  const { ScheduledTaskTargetPicker } = await import('./ScheduledTaskTargetPicker');
  const { I18nProvider } = await import('@/lib/i18n');
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(
      <I18nProvider>
        <ScheduledTaskTargetPicker value="" eligible={[]} known={[]} load="ready" isMobile={isMobile} onSelect={() => {}} />
      </I18nProvider>,
    ));
    const trigger = container.querySelector('button');
    return { haspopup: trigger?.getAttribute('aria-haspopup') ?? null, expanded: trigger?.getAttribute('aria-expanded') ?? null };
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
};

describe('ScheduledTaskTargetPicker trigger', () => {
  test('on desktop the field says it opens a menu and whether it is open', async () => {
    expect(await renderTrigger(false)).toEqual({ haspopup: 'menu', expanded: 'false' });
  });

  test('on a phone the field says it opens a dialog', async () => {
    expect(await renderTrigger(true)).toEqual({ haspopup: 'dialog', expanded: 'false' });
  });
});
