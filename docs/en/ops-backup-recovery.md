# Ops Backup And Recovery

Korean detailed guide: [../ops-backup-recovery.md](../ops-backup-recovery.md)

## Backup Targets

Back up operational state, not runtime caches:

- auth store and user/scope data
- channel registry
- rule registry and profiles
- audit records
- EventRecord metadata
- configuration presets

Do not back up customer evidence into the public repository.

## Recovery Flow

1. Stop the server.
2. Restore config and state files into the expected data directory.
3. Start the server in foreground or controlled background mode.
4. Run health and auth checks.
5. Verify channels, rules, users, and event records in Ops.

## Dry Run

Use the rehearsal command when changing backup policy:

```bash
./server.sh verify-ops-backup-restore-dry-run
```

## Public Boundary

Backup data can contain credentials, scopes, private URLs, and field evidence references. It must never be committed or attached to public releases.
