---
name: quality-gates-before-stop
enabled: true
event: stop
pattern: .*
action: warn
---

⚠️ **Before stopping — confirm all quality gates passed**

Do NOT stop unless you have run and confirmed ALL four quality gates passed for the current task:

```bash
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && cd /home/nitekeeper/apps/obsidian-clipper/web-harvester && pnpm typecheck
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && cd /home/nitekeeper/apps/obsidian-clipper/web-harvester && pnpm lint
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && cd /home/nitekeeper/apps/obsidian-clipper/web-harvester && pnpm format:check
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && cd /home/nitekeeper/apps/obsidian-clipper/web-harvester && pnpm test:coverage
```

Also confirm:
- [ ] A git commit was made for this task
- [ ] The task is marked done before stopping
