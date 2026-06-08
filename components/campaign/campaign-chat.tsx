"use client";

import { useMemo } from "react";
import { useFormStatus } from "react-dom";
import { sendCampaignMessageAction } from "@/app/campaigns/[campaignId]/actions";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Textarea,
} from "@/components/ui";

type ChatPlayer = {
  id: string;
  displayName: string;
  color: string | null;
};

type ChatMessage = {
  id: string;
  campaignPlayerId: string;
  body: string;
  createdAt: string;
};

type CampaignChatProps = {
  campaignId: string;
  players: ChatPlayer[];
  messages: ChatMessage[];
  currentPlayerId: string | null;
  canSend: boolean;
  unavailableMessage: string | null;
};

function formatMessageDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function SendMessageButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      size="sm"
      className="fantasy-action-button w-full gap-2"
      disabled={pending}
      aria-live="polite"
    >
      {pending ? (
        <>
          <span
            className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden="true"
          />
          Envoi...
        </>
      ) : (
        "Envoyer"
      )}
    </Button>
  );
}

export function CampaignChat({
  campaignId,
  players,
  messages,
  currentPlayerId,
  canSend,
  unavailableMessage,
}: CampaignChatProps) {
  const playersById = useMemo(
    () => new Map(players.map((player) => [player.id, player])),
    [players],
  );
  const orderedMessages = useMemo(() => [...messages].reverse(), [messages]);

  return (
    <Card id="campaign-chat" className="fantasy-panel scroll-mt-4">
      <CardHeader>
        <CardTitle className="fantasy-panel-title">Chat de partie</CardTitle>
        <CardDescription className="fantasy-muted">
          Messages visibles par les joueurs actifs de cette campagne.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
          {orderedMessages.length ? (
            orderedMessages.map((message) => {
              const author = playersById.get(message.campaignPlayerId);
              const isCurrentPlayer = message.campaignPlayerId === currentPlayerId;
              const authorName = author?.displayName ?? "Joueur";

              return (
                <article
                  key={message.id}
                  className={`fantasy-stat p-3 ${
                    isCurrentPlayer ? "border-[#d5a653]/70" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="inline-block size-3 shrink-0 rounded-sm border border-[#f1dfab]/70"
                        style={{
                          backgroundColor: author?.color ?? "#c8bca7",
                        }}
                        aria-hidden="true"
                      />
                      <p className="truncate text-sm font-semibold text-[#f3ead7]">
                        {authorName}
                      </p>
                    </div>
                    <time
                      className="shrink-0 text-xs font-semibold text-[#c9a45d]"
                      dateTime={message.createdAt}
                    >
                      {formatMessageDate(message.createdAt)}
                    </time>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#d8cbb8]">
                    {message.body}
                  </p>
                </article>
              );
            })
          ) : (
            <p className="fantasy-alert p-4 text-sm">
              Aucun message pour le moment.
            </p>
          )}
        </div>

        {canSend ? (
          <form action={sendCampaignMessageAction} className="space-y-3">
            <input type="hidden" name="campaignId" value={campaignId} />
            <Textarea
              name="body"
              label="Message"
              maxLength={800}
              rows={3}
              required
              placeholder="Écrire aux autres joueurs..."
              className="min-h-24 resize-none"
            />
            <SendMessageButton />
          </form>
        ) : (
          <p className="fantasy-alert p-3 text-sm">
            {unavailableMessage ?? "Le chat n'est pas disponible."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
