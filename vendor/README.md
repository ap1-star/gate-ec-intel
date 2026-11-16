# Portal source handover

The original user-provided archive is retained for reproducible Part 2 source access. It is audit input, not a second application or active dependency. The production build packages only dist; it never publishes this archive.

Verify portal-manifest.json before extraction. Extract into a temporary audit directory. Read docs/integration/PORTAL_FEATURE_INVENTORY.md and the integration handoff before implementation. The source handover setup instructions do not authorize running migrations or activating providers.

The ZIP contains public reference seeds, source schema/migrations, tests, and provider-specific code. It excludes live private database rows and environment secrets. README.md is absent despite being referenced by the source handover.
