type LogoVariant = "small" | "large";

interface LogoProps {
  variant?: LogoVariant;
}

const containerClasses: Record<LogoVariant, string> = {
  small: "handdrawn-box inline-block bg-background px-6 py-3",
  large: "handdrawn-box inline-block bg-background px-10 py-6",
};

const textClasses: Record<LogoVariant, string> = {
  small: "text-xs font-bold uppercase tracking-[0.35rem] text-foreground sm:text-sm",
  large: "text-2xl font-bold uppercase tracking-[0.4rem] text-foreground sm:text-3xl",
};

const Logo = ({ variant = "small" }: LogoProps) => {
  return (
    <div className={containerClasses[variant]}>
      <h1 className={textClasses[variant]}>LingoScrape</h1>
    </div>
  );
};

export default Logo;
