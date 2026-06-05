import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import type { CampaignLogItem } from "@/lib/campaigns/campaign-dashboard-service";

type CampaignLogProps = {
  logs: CampaignLogItem[];
};

const logTypeLabels: Record<string, string> = {
  campaign_created: "Campagne",
  player_joined: "Demande",
  player_approved: "Joueur",
  campaign_launched: "Lancement",
  orders_revealed: "Ordres",
  battle_created: "Bataille",
  battle_result: "Bataille",
  exploration_result: "Exploration",
  territory_fortified: "Fortification",
  legendary_recruitment: "Recrutement",
  turn_finished: "Tour",
  season_finished: "Saison",
  campaign_archived: "Archive",
};

function getLogVariant(type: string) {
  if (type === "battle_result" || type === "battle_created") {
    return "danger" as const;
  }

  if (type === "exploration_result") return "success" as const;
  if (type === "legendary_recruitment") return "warning" as const;
  if (type === "territory_fortified") return "warning" as const;
  if (type === "orders_revealed" || type === "turn_finished") {
    return "info" as const;
  }

  return "neutral" as const;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getGroupLabel(log: CampaignLogItem) {
  if (!log.turn) return "Campagne";

  return `Saison ${log.turn.season_number} - Tour ${log.turn.turn_number}`;
}

function groupLogs(logs: CampaignLogItem[]) {
  return logs.reduce<
    {
      label: string;
      logs: CampaignLogItem[];
    }[]
  >((groups, log) => {
    const label = getGroupLabel(log);
    const existingGroup = groups.find((group) => group.label === label);

    if (existingGroup) {
      existingGroup.logs.push(log);
    } else {
      groups.push({ label, logs: [log] });
    }

    return groups;
  }, []);
}

export function CampaignLog({ logs }: CampaignLogProps) {
  const groups = groupLogs(logs);

  return (
    <Card className="fantasy-panel">
      <CardHeader>
        <CardTitle className="fantasy-panel-title">
          Historique récent
        </CardTitle>
        <CardDescription className="fantasy-muted">
          Les derniers événements importants de la campagne.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {groups.length ? (
          <div className="space-y-5">
            {groups.map((group) => (
              <section key={group.label} className="space-y-3">
                <div className="flex items-center gap-3">
                  <Badge variant="neutral">{group.label}</Badge>
                  <div className="fantasy-divider flex-1" />
                </div>
                <ol className="space-y-3">
                  {group.logs.map((log) => (
                    <li
                      key={log.id}
                      className="grid gap-3 border-l-2 border-[#c89a53]/45 pl-4 sm:grid-cols-[1fr_auto]"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={getLogVariant(log.type)}>
                            {logTypeLabels[log.type] ?? log.type}
                          </Badge>
                          <p className="font-semibold text-[#f3ead7]">
                            {log.title}
                          </p>
                        </div>
                        {log.description ? (
                          <p className="fantasy-muted mt-2 text-sm leading-6">
                            {log.description}
                          </p>
                        ) : null}
                      </div>
                      <time
                        className="text-sm font-semibold text-[#c9a45d]"
                        dateTime={log.created_at}
                      >
                        {formatDate(log.created_at)}
                      </time>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        ) : (
          <p className="fantasy-alert p-4 text-sm">
            Aucun événement enregistré pour le moment.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
