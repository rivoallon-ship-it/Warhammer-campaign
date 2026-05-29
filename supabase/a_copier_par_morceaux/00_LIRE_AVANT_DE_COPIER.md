# SQL Supabase à copier par morceaux

Copie-colle les fichiers `.sql` dans Supabase **dans cet ordre exact**.

1. `01_extensions_tables_base.sql`
2. `02_tables_ordres_batailles.sql`
3. `03_tables_index_triggers.sql`
4. `04_auth_helpers_1.sql`
5. `05_auth_helpers_2.sql`
6. `06_visibility_orders.sql`
7. `06b_multi_battle_support.sql`
8. `07_reveal_orders_function.sql`
9. `08_resolve_exploration_function.sql`
10. `09_resolve_battle_function.sql`
11. `09b_finish_turn_function.sql`
12. `10_rls_core.sql`
13. `11_rls_players.sql`
14. `12_rls_map_turns.sql`
15. `13_rls_orders_resolution.sql`
16. `14_logs_grants.sql`

Dans Supabase SQL Editor :

1. Ouvre le fichier 01.
2. Copie tout son contenu.
3. Colle dans l'éditeur SQL.
4. Clique `Run`.
5. Efface l'éditeur.
6. Passe au fichier suivant.

Ne mélange pas plusieurs morceaux dans la même requête.
