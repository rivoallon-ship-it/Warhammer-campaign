# SQL Supabase à copier par morceaux

Copie-colle les fichiers `.sql` dans Supabase **dans cet ordre exact**.
Chaque fichier est volontairement limité à moins de 100 lignes.

1. `01_extensions_tables_base.sql`
2. `02_tables_ordres_batailles.sql`
3. `02c_conquer_action_type.sql`
4. `03_tables_index_triggers.sql`
5. `04_auth_helpers_1.sql`
6. `05a_auth_membership_helpers.sql`
7. `05b_join_campaign_details.sql`
8. `05c_request_join_campaign.sql`
9. `06_visibility_orders.sql`
10. `06b_multi_battle_support.sql`
11. `15_territory_rules_schema.sql`
12. `07_reveal_orders_function.sql`
13. `08_resolve_exploration_function.sql`
14. `09_resolve_battle_function.sql`
15. `09b_finish_turn_function.sql`
16. `10_rls_core.sql`
17. `11_rls_players.sql`
18. `12_rls_map_turns.sql`
19. `13_rls_orders_resolution.sql`
20. `16_legendary_recruitment.sql`
21. `14_logs_grants.sql`

Dans Supabase SQL Editor :

1. Ouvre le fichier 01.
2. Copie tout son contenu.
3. Colle dans l'éditeur SQL.
4. Clique `Run`.
5. Efface l'éditeur.
6. Passe au fichier suivant.

Ne mélange pas plusieurs morceaux dans la même requête.

Correctifs ponctuels :

- `17_hotfix_special_reward_claimed_at.sql` : à lancer si Supabase affiche
  `column t.special_reward_claimed_at does not exist` pendant la révélation.
