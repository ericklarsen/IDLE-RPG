import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Makes a modal behave like one: focus moves to the dialog (not to its primary
 * button, so nothing is claimed by accident), Tab cycles inside it, Escape
 * closes it, and focus returns to whatever opened it.
 */
export function useDialog(ref: RefObject<HTMLElement | null>, onClose?: () => void) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const previous = document.activeElement as HTMLElement | null;
    const focusables = () =>
      Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) => element.offsetParent !== null,
      );

    node.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (!closeRef.current) return;
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const items = focusables();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }

      const head = items[0];
      const tail = items[items.length - 1];
      const active = document.activeElement;

      if (!node.contains(active) || active === node) {
        event.preventDefault();
        (event.shiftKey ? tail : head).focus();
      } else if (!event.shiftKey && active === tail) {
        event.preventDefault();
        head.focus();
      } else if (event.shiftKey && active === head) {
        event.preventDefault();
        tail.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (previous && document.contains(previous)) previous.focus();
    };
  }, [ref]);
}
