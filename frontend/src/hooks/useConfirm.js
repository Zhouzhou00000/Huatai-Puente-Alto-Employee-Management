import { useState, useCallback } from 'react';

export default function useConfirm() {
  const [state, setState] = useState({ message: null, resolve: null });

  const confirm = useCallback((message) => {
    return new Promise((resolve) => {
      setState({ message, resolve });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    state.resolve?.(true);
    setState({ message: null, resolve: null });
  }, [state]);

  const handleCancel = useCallback(() => {
    state.resolve?.(false);
    setState({ message: null, resolve: null });
  }, [state]);

  return {
    confirmMessage: state.message,
    confirm,
    handleConfirm,
    handleCancel,
  };
}
