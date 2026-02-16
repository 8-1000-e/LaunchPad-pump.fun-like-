"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { Check, X, AlertCircle, Info } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toast: (type: ToastType, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const ctx: ToastContextType = {
    toast: addToast,
    success: (msg) => addToast("success", msg),
    error: (msg) => addToast("error", msg),
    info: (msg) => addToast("info", msg),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}

      {/* Toast container */}
      <div className="fixed bottom-20 right-4 z-[100] flex flex-col gap-2 lg:bottom-6">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const config = {
    success: {
      icon: Check,
      border: "border-buy/30",
      bg: "bg-buy/5",
      text: "text-buy",
    },
    error: {
      icon: AlertCircle,
      border: "border-sell/30",
      bg: "bg-sell/5",
      text: "text-sell",
    },
    info: {
      icon: Info,
      border: "border-brand/30",
      bg: "bg-brand/5",
      text: "text-brand",
    },
  }[toast.type];

  const Icon = config.icon;

  return (
    <div
      className={`flex items-start gap-2.5 border ${config.border} ${config.bg} px-4 py-3 backdrop-blur-sm shadow-lg min-w-[260px] max-w-[380px]`}
      style={{ animation: "fade-in-up 0.25s ease-out" }}
    >
      <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${config.text}`} />
      <p className="flex-1 text-[13px] text-text-1 leading-snug">{toast.message}</p>
      <button
        onClick={onDismiss}
        className="shrink-0 text-text-3 hover:text-text-1 transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback for when toast is used outside provider (shouldn't happen)
    return {
      toast: () => {},
      success: () => {},
      error: () => {},
      info: () => {},
    };
  }
  return ctx;
}
