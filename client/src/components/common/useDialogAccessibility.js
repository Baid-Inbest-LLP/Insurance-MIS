import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const isTopmostDialog = (dialog) => {
  const dialogs = document.querySelectorAll('[data-dialog-root="true"]');
  return dialogs[dialogs.length - 1] === dialog;
};

// Keeps keyboard focus inside the visible, top-most dialog and restores the opener's focus on close.
// Nested confirmation dialogs work because only the final dialog in DOM order handles keyboard events.
export default function useDialogAccessibility(
  open,
  dialogRef,
  { onClose, closeDisabled = false, initialFocusRef } = {},
) {
  const previouslyFocusedRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    previouslyFocusedRef.current = document.activeElement;
    const dialog = dialogRef.current;
    const getFocusable = () =>
      dialog
        ? [...dialog.querySelectorAll(FOCUSABLE_SELECTOR)].filter(
            (element) => !element.hasAttribute('inert'),
          )
        : [];

    const focusInitial = () => {
      if (!dialog || !isTopmostDialog(dialog)) return;
      (initialFocusRef?.current || getFocusable()[0] || dialog).focus();
    };
    const frameId = requestAnimationFrame(focusInitial);

    const handleKeyDown = (event) => {
      if (!dialog || !isTopmostDialog(dialog)) return;

      if (event.key === 'Escape' && !closeDisabled) {
        event.preventDefault();
        onClose?.();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = getFocusable();
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const currentIndex = focusable.indexOf(document.activeElement);
      const nextIndex = event.shiftKey
        ? currentIndex <= 0
          ? focusable.length - 1
          : currentIndex - 1
        : currentIndex === -1 || currentIndex === focusable.length - 1
          ? 0
          : currentIndex + 1;

      event.preventDefault();
      focusable[nextIndex].focus();
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      cancelAnimationFrame(frameId);
      document.removeEventListener('keydown', handleKeyDown, true);
      const previous = previouslyFocusedRef.current;
      if (previous?.isConnected) previous.focus();
    };
  }, [open, dialogRef, onClose, closeDisabled, initialFocusRef]);
}
