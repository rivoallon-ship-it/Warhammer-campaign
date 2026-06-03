import { cn } from "@/lib/utils";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("max-w-3xl", className)}>
      {eyebrow ? (
        <p className="mb-3 text-sm font-bold uppercase text-[#c9a45d]">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="fantasy-panel-title text-3xl font-bold leading-tight sm:text-4xl">
        {title}
      </h1>
      {description ? (
        <p className="fantasy-muted mt-4 text-base leading-7">{description}</p>
      ) : null}
    </div>
  );
}
