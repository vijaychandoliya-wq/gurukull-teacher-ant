# Gurukull migration scope: Teacher React Native app

Applies when working on the Cloudflare Free migration. Read the governing [root AGENTS.md](</Volumes/Cricial 500/education-platforms/AGENTS.md>) first. The latest migration target is Workers Free, Rajesh school and no dummy data; older $5 estimates are reference material, not authorization for paid usage.

Read these implementation guides before editing this project:

- [01-api](</Volumes/Cricial 500/education-platforms/cloudflare-migration-plan/agent-guides/01-api/AGENTS.md>)
- [03-rajesh-school](</Volumes/Cricial 500/education-platforms/cloudflare-migration-plan/agent-guides/03-rajesh-school/AGENTS.md>)
- [05-mobile-sqlite](</Volumes/Cricial 500/education-platforms/cloudflare-migration-plan/agent-guides/05-mobile-sqlite/AGENTS.md>)
- [06-firebase](</Volumes/Cricial 500/education-platforms/cloudflare-migration-plan/agent-guides/06-firebase/AGENTS.md>)
- [08-validation-cutover](</Volumes/Cricial 500/education-platforms/cloudflare-migration-plan/agent-guides/08-validation-cutover/AGENTS.md>)

Inspect src/api.ts, screens, navigation and native Android/iOS config. Teacher paths already include /api. No GW101 default or demo teacher login. Use school discovery, real roles, protected SQLite and idempotent attendance/mark drafts.

Do not deploy, seed, create Rajesh or send Firebase/email notifications merely because this instruction file exists. The current requested deliverable is the instruction package. Future implementation follows its actual user authorization, preserving user changes and recording real evidence.

Missing genuine administrator details, school configuration, provider access or device/data tests must be reported explicitly. No dummy records, simulated successful delivery, insecure auth shortcut or hidden paid upgrade.
