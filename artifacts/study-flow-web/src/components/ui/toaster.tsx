import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

function ToastProgressBar({ duration }: { duration: number }) {
  return (
    <div className="absolute bottom-0 left-0 right-0 h-[3px] overflow-hidden rounded-b-md bg-foreground/10">
      <div
        className="h-full bg-primary origin-left"
        style={{
          animation: `toast-drain ${duration}ms linear forwards`,
        }}
      />
      <style>{`
        @keyframes toast-drain {
          from { transform: scaleX(1); }
          to   { transform: scaleX(0); }
        }
      `}</style>
    </div>
  )
}

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, duration, ...props }) {
        return (
          <Toast key={id} duration={duration} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
            {duration && duration < Infinity && (
              <ToastProgressBar duration={duration} />
            )}
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
