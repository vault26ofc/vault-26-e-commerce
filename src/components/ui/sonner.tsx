import { Toaster as Sonner, toast as rawToast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const safeToast = (message: any, data?: any) => {
  if (!message || (typeof message === 'string' && !message.trim())) return;
  return rawToast(message, data);
};

safeToast.error = (message: any, data?: any) => {
  if (!message || (typeof message === 'string' && !message.trim())) return;
  return rawToast.error(message, data);
};

safeToast.success = (message: any, data?: any) => {
  if (!message || (typeof message === 'string' && !message.trim())) return;
  return rawToast.success(message, data);
};

safeToast.info = (message: any, data?: any) => {
  if (!message || (typeof message === 'string' && !message.trim())) return;
  return rawToast.info(message, data);
};

safeToast.warning = (message: any, data?: any) => {
  if (!message || (typeof message === 'string' && !message.trim())) return;
  return rawToast.warning(message, data);
};

safeToast.dismiss = rawToast.dismiss;
safeToast.loading = rawToast.loading;
safeToast.promise = rawToast.promise;
safeToast.custom = rawToast.custom;

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
            "group toast !rounded-none !border !shadow-[0_4px_40px_rgba(0,0,0,0.12)] !px-5 !py-4 !gap-3 !font-ui !bg-white !text-black !border-black/10",
          title:
            "!text-[11px] !tracking-[0.18em] !uppercase !font-bold !font-ui text-inherit",
          description:
            "!text-[10px] !tracking-[0.08em] !font-ui !mt-0.5 opacity-70 text-inherit",
          error:
            "!bg-black !text-white !border-black [&_[data-title]]:!text-white [&_[data-description]]:!text-white/70",
          success:
            "!bg-white !text-black !border-l-4 !border-l-black !border-t-0 !border-r-0 !border-b-0 [&_[data-title]]:!text-black [&_[data-description]]:!text-black/60",
          warning:
            "!bg-white !text-black !border-l-4 !border-l-amber-500 !border-t-0 !border-r-0 !border-b-0 [&_[data-title]]:!text-black [&_[data-description]]:!text-black/60",
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

export { Toaster, safeToast as toast };
