# SQL Supabase à copier par morceaux

Copie-colle les fichiers `.sql` dans Supabase **dans cet ordre exact**.

1. `01_extensions_tables_base.sql`
2. `02_tables_ordres_batailles.sql`
3. `02c_conquer_action_type.sql`
4. `03_tables_index_triggers.sql`
5. `04_auth_helpers_1.sql`
6. `05_auth_helpers_2.sql`
7. `06_visibility_orders.sql`
8. `06b_multi_battle_support.sql`
9. `07_reveal_orders_function.sql`
10. `08_resolve_exploration_function.sql`
11. `09_resolve_battle_function.sql`
12. `09b_finish_turn_function.sql`
13. `10_rls_core.sql`
14. `11_rls_players.sql`
15. `12_rls_map_turns.sql`
16. `13_rls_orders_resolution.sql`
17. `14_logs_grants.sql`

Dans Supabase SQL Editor :

1. Ouvre le fichier 01.
2. Copie tout son contenu.
3. Colle dans l'éditeur SQL.
4. Clique `Run`.
5. Efface l'éditeur.
6. Passe au fichier suivant.

Ne mélange pas plusieurs morceaux dans la même requête.
