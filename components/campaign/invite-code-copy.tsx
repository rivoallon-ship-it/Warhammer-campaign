"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

type InviteCodeCopyProps = {
  code: string;
};

export function InviteCodeCopy({ code }: InviteCodeCopyProps) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
  }

  return (
    <Button type="button" variant="outline" className="w-full" onClick={copyCode}>
      {copied ? "Code copié" : "Copier le code"}
    </Button>
  );
}
