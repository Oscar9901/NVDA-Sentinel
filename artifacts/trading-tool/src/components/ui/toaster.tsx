import * as React from "react"
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast"
import { useToast } from "@/hooks/use-toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props} className="bg-card border-border rounded-none shadow-xl font-mono">
            <div className="grid gap-1">
              {title && <ToastTitle className="text-primary font-bold uppercase tracking-wider">{title}</ToastTitle>}
              {description && (
                <ToastDescription className="text-muted-foreground">{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose className="text-muted-foreground hover:text-primary rounded-none" />
          </Toast>
        )
      })}
      <ToastViewport className="sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]" />
    </ToastProvider>
  )
}
