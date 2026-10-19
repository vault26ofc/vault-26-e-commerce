import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/** "Are you sure?" before a change the customer can't easily undo. */
export function ConfirmDialog({ open, title, body, confirmLabel = 'Yes, save', onConfirm, onCancel }: {
  open: boolean; title: string; body: React.ReactNode; confirmLabel?: string;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <AlertDialogContent className="sm:rounded-none">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[13px] tracking-[0.04em] uppercase font-ui font-bold">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-[12px] font-ui text-black/60">{body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-none text-[10px] tracking-[0.04em] uppercase font-ui font-bold">Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="rounded-none bg-[#BB0006] hover:bg-[#AA0001] text-white text-[10px] tracking-[0.04em] uppercase font-ui font-bold">
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
