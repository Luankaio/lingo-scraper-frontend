import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="paper-background flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="handdrawn-box bg-background px-6 py-4 shadow-[10px_10px_0_0_rgba(0,0,0,0.45)]">
        <h1 className="text-5xl font-bold uppercase tracking-[0.35em] text-foreground">404</h1>
      </div>
      <p className="max-w-md font-handdrawn text-lg text-foreground/80">
        Parece que essa página ainda não foi rabiscada.
      </p>
      <Link
        to="/"
        className="sketch-border inline-flex items-center gap-2 border-2 border-foreground bg-background px-5 py-3 text-sm uppercase tracking-[0.3em] text-foreground shadow-[8px_8px_0_0_rgba(0,0,0,0.45)] transition-transform hover:-translate-x-1 hover:-translate-y-1"
      >
        Voltar para o início
      </Link>
    </div>
  );
};

export default NotFound;
