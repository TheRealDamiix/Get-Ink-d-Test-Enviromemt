import { useState, useEffect } from 'react';
import type { ToastProps } from '@/components/ui/toast';

const TOAST_LIMIT = 1;

export interface ToastData extends Omit<ToastProps, 'id' | 'title' | 'description'> {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactElement;
  duration?: number;
  dismiss: () => void;
}

interface ToastState {
  toasts: ToastData[];
}

let count = 0;
function generateId(): string {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

type Listener = (state: ToastState) => void;

const toastStore = {
  state: { toasts: [] as ToastData[] },
  listeners: [] as Listener[],

  getState: () => toastStore.state,

  setState: (nextState: ToastState | ((prev: ToastState) => ToastState)) => {
    if (typeof nextState === 'function') {
      toastStore.state = nextState(toastStore.state);
    } else {
      toastStore.state = { ...toastStore.state, ...nextState };
    }
    toastStore.listeners.forEach(listener => listener(toastStore.state));
  },

  subscribe: (listener: Listener) => {
    toastStore.listeners.push(listener);
    return () => {
      toastStore.listeners = toastStore.listeners.filter(l => l !== listener);
    };
  },
};

export interface ToastInput extends Omit<ToastData, 'id' | 'dismiss'> {
  id?: string;
}

export const toast = (props: ToastInput) => {
  const id = generateId();

  const update = (updatedProps: Partial<ToastData>) =>
    toastStore.setState(state => ({
      ...state,
      toasts: state.toasts.map(t => (t.id === id ? { ...t, ...updatedProps } : t)),
    }));

  const dismiss = () =>
    toastStore.setState(state => ({
      ...state,
      toasts: state.toasts.filter(t => t.id !== id),
    }));

  toastStore.setState(state => ({
    ...state,
    toasts: [{ ...props, id, dismiss }, ...state.toasts].slice(0, TOAST_LIMIT),
  }));

  return { id, dismiss, update };
};

export function useToast() {
  const [state, setState] = useState<ToastState>(toastStore.getState());

  useEffect(() => {
    const unsubscribe = toastStore.subscribe(newState => setState(newState));
    return unsubscribe;
  }, []);

  useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    state.toasts.forEach(toastItem => {
      if (toastItem.duration === Infinity) return;
      const timeout = setTimeout(() => {
        toastItem.dismiss();
      }, toastItem.duration || 5000);
      timeouts.push(timeout);
    });

    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [state.toasts]);

  return { toast, toasts: state.toasts };
}
