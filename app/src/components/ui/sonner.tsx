import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = (props: ToasterProps) => (
  <Sonner
    theme="dark"
    position="top-center"
    duration={2200}
    offset={{ top: 12 }}
    mobileOffset={{ top: 12 }}
    toastOptions={{
      classNames: {
        toast: "!rounded-2xl !border-2 !border-ink/20 !bg-panel-2 !text-ink !font-sans !text-base !font-semibold",
        error: "!bg-[#3a1229] !border-rose",
        success: "!bg-[#13291f] !border-mint",
      },
    }}
    {...props}
  />
)

export { Toaster }
