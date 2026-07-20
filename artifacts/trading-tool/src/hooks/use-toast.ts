import { useState, useEffect } from 'react';

const TOAST_TIMEOUT = 5000;

export type ToastProps = {
  id: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
};

let memoryState: ToastProps[] = [];
let listeners: Function[] = [];

export function useToast() {
  const [toasts, setToasts] = useState<ToastProps[]>(memoryState);

  useEffect(() => {
    listeners.push(setToasts);
    return () => {
      listeners = listeners.filter((l) => l !== setToasts);
    };
  }, []);

  function toast({ title, description, action }: Omit<ToastProps, 'id'>) {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { id, title, description, action };
    
    memoryState = [...memoryState, newToast];
    listeners.forEach((listener) => listener(memoryState));

    setTimeout(() => {
      memoryState = memoryState.filter((t) => t.id !== id);
      listeners.forEach((listener) => listener(memoryState));
    }, TOAST_TIMEOUT);
  }

  return { toast, toasts };
}
