import { useState } from "react";
import { useNavigate } from "react-router-dom";

import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const Index = () => {
  const [pageName, setPageName] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const safeValue = pageName.trim();

    if (safeValue) {
      navigate(`/${safeValue}`);
    }
  };

  return (
    <div className="paper-background relative flex min-h-screen w-screen items-center justify-center overflow-hidden px-6 py-16">
      <div className="paper-grain pointer-events-none" aria-hidden />
          <div className="paper-sheet relative w-full max-w-3xl space-y-12 border-4 border-foreground bg-background px-8 py-14 text-center shadow-[20px_24px_0_-6px_rgba(0,0,0,0.85),20px_24px_0_0_rgba(253,251,245,1)] sm:px-16">
        <div className="paper-sheet-inner pointer-events-none" aria-hidden />

        <div className="flex flex-col items-center gap-8">
          <Logo />
          <p className="max-w-xl text-lg text-foreground/80 sm:text-xl">
            Learn languages with your own news scraper.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="form-card relative mx-auto flex w-full max-w-xl flex-col gap-6 border-4 border-foreground bg-background px-8 py-12 shadow-[14px_14px_0_0_rgba(0,0,0,0.6)]"
        >
          <div className="form-card-outline pointer-events-none" aria-hidden />
          <div className="space-y-4">
            <label htmlFor="page-name" className="block text-base font-semibold uppercase tracking-widest text-left">
              Name your page
            </label>
            <div className="sketch-input">
              <Input
                id="page-name"
                value={pageName}
                onChange={(event) => setPageName(event.target.value)}
                placeholder="your-secret-page"
                className="h-14 bg-transparent text-center text-xl placeholder:text-foreground/30"
              />
            </div>
                <p className="text-sm text-muted-foreground">
                  We’ll take you to <code className="rounded-sm border border-dashed border-foreground/40 bg-background/60 px-2 py-1 text-sm">/{'{'}name{'}'}</code>.
            </p>
          </div>
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <span className="text-sm uppercase tracking-[0.3em] text-muted-foreground">no login</span>
            <Button type="submit" className="px-12">
              start
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Index;
