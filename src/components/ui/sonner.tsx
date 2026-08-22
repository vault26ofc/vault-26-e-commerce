import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        duration: 4000,
        classNames: {
          toaster: "!font-ui",
          toast:
            "!rounded-none !border !border-black/10 !bg-white !text-black !shadow-[0_4px_40px_rgba(0,0,0,0.12)] !px-5 !py-4 !gap-3 !font-ui",
          title:
            "!text-[11px] !tracking-[0.18em] !uppercase !font-bold !text-black !font-ui",
          description:
            "!text-[10px] !tracking-[0.08em] !text-black/50 !font-ui !mt-0.5",
          error:
            "!bg-black !text-white !border-black [&_[data-title]]:!text-white [&_[data-description]]:!text-white/60",
          success:
            "!bg-white !text-black !border-l-2 !border-l-black !border-t-0 !border-r-0 !border-b-0",
          warning:
            "!bg-white !text-black !border-l-2 !border-l-amber-500 !border-t-0 !border-r-0 !border-b-0",
          actionButton:
            "!rounded-none !bg-black !text-white !text-[10px] !tracking-[0.2em] !uppercase !font-bold !font-ui",
          cancelButton:
            "!rounded-none !bg-transparent !text-black/40 !text-[10px] !tracking-[0.2em] !uppercase !font-ui",
          closeButton:
            "!rounded-none !border !border-black/10 !text-black/30 hover:!text-black hover:!bg-black/5",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
