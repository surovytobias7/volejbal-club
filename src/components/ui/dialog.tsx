"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./button";

export function FormDialog({
  title,
  description,
  children,
  label = title,
  variant = "default",
}: {
  title: string;
  description: string;
  children: ReactNode;
  label?: string;
  variant?: "default" | "secondary";
}) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button variant={variant}>{label}</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content">
          <Dialog.Title className="dialog-title">{title}</Dialog.Title>
          <Dialog.Description className="muted">
            {description}
          </Dialog.Description>
          <Dialog.Close
            className="icon-button dialog-close"
            aria-label="Zavrieť"
          >
            <X size={20} />
          </Dialog.Close>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
