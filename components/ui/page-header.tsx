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
        <p className="mb-3 text-sm font-bold uppercase text-[#8a3f2d]">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="text-3xl font-bold leading-tight text-[#211a16] sm:text-4xl">
        {title}
      </h1>
      {description ? (
        <p className="mt-4 text-base leading-7 text-[#5d5148]">{description}</p>
      ) : null}
    </div>
  );
}
