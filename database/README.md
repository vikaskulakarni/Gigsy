# Database assets

Based on the supplied MySQL 8.0.46 schema-only export.

- relational_mapping.md: verified relation/key summary and model caveats
- er_diagram.mmd: editable Mermaid ER diagram source
- query_bank.sql: read-oriented SQL examples; UPDATE/DELETE are commented
- advanced_features.sql: adds a read-only skill-match percentage function

## Safety

1. The original schema-only dump is documentation evidence, not a migration. It contains DROP statements and must never be imported into the working database.
2. query_bank.sql is primarily read-only. DML examples are commented and use placeholders.
3. advanced_features.sql adds one function. Back up and test on a disposable development database before applying.
4. Existing tables, views, procedure and trigger are not recreated.
5. Gigsy currently has a legacy hiring schema and a newer gigsy_* application workflow. See relational_mapping.md before planning any migration.
