"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { sendCampaignMessageAction } from "@/app/campaigns/[campaignId]/actions";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Select,
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
  recipientCampaignPlayerId: string | null;
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

function PlayerMark({ player }: { player: ChatPlayer | undefined }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <span
        className="inline-block size-3 shrink-0 rounded-sm border border-[#f1dfab]/70"
        style={{ backgroundColor: player?.color ?? "#c8bca7" }}
        aria-hidden="true"
      />
      <span className="truncate">{player?.displayName ?? "Joueur"}</span>
    </span>
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
  const conversationPartners = useMemo(
    () =>
      currentPlayerId
        ? players.filter((player) => player.id !== currentPlayerId)
        : [],
    [currentPlayerId, players],
  );
  const [selectedPlayerId, setSelectedPlayerId] = useState(
    conversationPartners[0]?.id ?? "",
  );
  const playersById = useMemo(
    () => new Map(players.map((player) => [player.id, player])),
    [players],
  );
  const orderedMessages = useMemo(() => [...messages].reverse(), [messages]);
  const selectedPlayer = selectedPlayerId
    ? playersById.get(selectedPlayerId)
    : null;
  const conversationMessages =
    currentPlayerId && selectedPlayerId
      ? orderedMessages.filter((message) => {
          const participants = [
            message.campaignPlayerId,
            message.recipientCampaignPlayerId,
          ];

          return (
            participants.includes(currentPlayerId) &&
            participants.includes(selectedPlayerId)
          );
        })
      : [];

  return (
    <Card id="campaign-chat" className="fantasy-panel scroll-mt-4">
      <CardHeader>
        <CardTitle className="fantasy-panel-title">Diplomatie</CardTitle>
        <CardDescription className="fantasy-muted">
          Messages privés entre deux joueurs. Aucun canal général.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {canSend && conversationPartners.length ? (
          <Select
            label="Interlocuteur"
            name="selectedConversation"
            value={selectedPlayerId}
            onChange={(event) => setSelectedPlayerId(event.currentTarget.value)}
            options={conversationPartners.map((player) => ({
              label: player.displayName,
              value: player.id,
            }))}
          />
        ) : null}

        <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
          {selectedPlayer ? (
            <div className="fantasy-stat flex items-center justify-between gap-3 p-3 text-sm">
              <span className="min-w-0 font-semibold text-[#f3ead7]">
                Conversation avec <PlayerMark player={selectedPlayer} />
              </span>
              <Badge variant="neutral">Privé</Badge>
            </div>
          ) : null}

          {conversationMessages.length ? (
            conversationMessages.map((message) => {
              const author = playersById.get(message.campaignPlayerId);
              const isCurrentPlayer = message.campaignPlayerId === currentPlayerId;

              return (
                <article
                  key={message.id}
                  className={`fantasy-stat p-3 ${
                    isCurrentPlayer ? "border-[#d5a653]/70" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 text-sm font-semibold text-[#f3ead7]">
                      {isCurrentPlayer ? "Moi" : <PlayerMark player={author} />}
                    </p>
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
              {selectedPlayer
                ? "Aucun message avec ce joueur pour le moment."
                : "Choisis un joueur pour démarrer une conversation."}
            </p>
          )}
        </div>

        {canSend && conversationPartners.length ? (
          <form action={sendCampaignMessageAction} className="space-y-3">
            <input type="hidden" name="campaignId" value={campaignId} />
            <input
              type="hidden"
              name="recipientCampaignPlayerId"
              value={selectedPlayerId}
            />
            <Textarea
              name="body"
              label="Message privé"
              maxLength={800}
              rows={3}
              required
              placeholder="Proposer une alliance, négocier une frontière..."
              className="min-h-24 resize-none"
            />
            <SendMessageButton />
          </form>
        ) : (
          <p className="fantasy-alert p-3 text-sm">
            {unavailableMessage ??
              "La diplomatie privée nécessite au moins deux joueurs actifs."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
