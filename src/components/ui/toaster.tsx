import { Toaster as SonnerToaster } from "sonner";

const Toaster = () => {
  return (
    <SonnerToaster
      position="top-right"
      toastOptions={{
        classNames: {
          toast: "paper-texture border-2 border-foreground/70 bg-background font-handdrawn text-base text-foreground shadow-[6px_6px_0_0_rgba(0,0,0,0.45)]",
          title: "font-bold",
          description: "text-sm text-foreground/80"
        }
      }}
    />
  );
};

export { Toaster };
