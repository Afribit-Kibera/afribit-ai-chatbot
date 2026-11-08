import * as Primitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useI18n } from "../../lib/i18n.js";
import { useRef, type ReactNode } from "react";
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className = "",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
}) {
  const { t } = useI18n();
  const returnFocus = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);
  if (open && !wasOpen.current && typeof document !== "undefined") {
    returnFocus.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
  }
  wasOpen.current = open;
  return (
    <Primitive.Root open={open} onOpenChange={onOpenChange}>
      <Primitive.Portal>
        <Primitive.Overlay className="dialog-overlay" />
        <Primitive.Content
          className={`dialog-content ${className}`}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (returnFocus.current?.isConnected) returnFocus.current.focus();
          }}
        >
          <Primitive.Title
            className={className.includes("drawer") ? "sr-only" : ""}
          >
            {title}
          </Primitive.Title>
          <Primitive.Description
            className={
              className.includes("drawer") ? "sr-only" : "dialog-description"
            }
          >
            {description}
          </Primitive.Description>
          {children}
          <Primitive.Close
            className="icon-button dialog-close"
            aria-label={t("common.close")}
          >
            <X size={18} />
          </Primitive.Close>
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  );
}
