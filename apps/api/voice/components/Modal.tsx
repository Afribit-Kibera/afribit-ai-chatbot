import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useRef, type ReactNode } from "react";

export function Modal({ open, onClose, title, description, children, wide = false }:
  { open: boolean; onClose: () => void; title: string; description: string; children: ReactNode; wide?: boolean }) {
  const origin = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);
  if (open && !wasOpen.current) origin.current = document.activeElement as HTMLElement;
  wasOpen.current = open;
  return <Dialog.Root open={open} onOpenChange={v => { if (!v) onClose(); }}>
    <Dialog.Portal><Dialog.Overlay className="modal-overlay" />
      <Dialog.Content className={`modal-content ${wide ? "modal-wide" : ""}`}
        onCloseAutoFocus={e => { if (origin.current?.isConnected) { e.preventDefault(); origin.current.focus(); } }}>
        <div className="modal-heading"><Dialog.Title>{title}</Dialog.Title>
          <Dialog.Close className="icon-button" aria-label="Close"><X size={20} /></Dialog.Close></div>
        <Dialog.Description className="muted modal-description">{description}</Dialog.Description>
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
