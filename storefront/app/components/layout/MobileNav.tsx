import * as Dialog from "@radix-ui/react-dialog";
import { Link } from "@remix-run/react";
import { X } from "lucide-react";

type Item = { to: string; label: string };

export function MobileNav({ open, onClose, items }: { open: boolean; onClose: () => void; items: Item[] }) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed left-0 top-0 bottom-0 w-72 bg-white z-50 p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="font-display font-bold text-lg">Menu</Dialog.Title>
            <Dialog.Close asChild>
              <button aria-label="Fechar" className="p-1">
                <X className="size-5" />
              </button>
            </Dialog.Close>
          </div>
          <nav className="flex flex-col gap-3">
            {items.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={onClose}
                className="text-base font-medium text-slate-800 hover:text-brand-primary"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
