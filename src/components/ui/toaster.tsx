import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        let effectiveVariant: 'default' | 'info' | 'success' | 'destructive' | 'warning' =
          (variant as any) || 'default';

        if (!variant || variant === 'default') {
          const text = `${String(title || '')} ${String(description || '')}`.toLowerCase();
          if (
            text.includes('reddet') ||
            text.includes('hata') ||
            text.includes('iptal') ||
            text.includes('silin') ||
            text.includes('error') ||
            text.includes('pas geçildi') ||
            text.includes('ulaşılamadı')
          ) {
            effectiveVariant = 'destructive';
          } else if (
            text.includes('kabul') ||
            text.includes('başar') ||
            text.includes('doğrul') ||
            text.includes('teslim') ||
            text.includes('yayınlan') ||
            text.includes('eklen') ||
            text.includes('güncellen') ||
            text.includes('çevrimiçi')
          ) {
            effectiveVariant = 'success';
          }
        }

        return (
          <Toast key={id} variant={effectiveVariant} {...props}>
            <div className="grid gap-0.5 pr-2">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
