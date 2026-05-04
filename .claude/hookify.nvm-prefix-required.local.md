---
name: nvm-prefix-required
enabled: true
event: bash
pattern: ^(pnpm|npm|npx|node)\s
action: block
---

🚫 **Node/pnpm command without nvm prefix detected**

All `pnpm`, `npm`, `npx`, and `node` commands MUST be prefixed with the nvm loader, otherwise they will fail silently (command not found).

**Required prefix:**
```bash
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" &&
```

**Correct example:**
```bash
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && pnpm test:coverage
```

Rewrite the command with the nvm prefix before running it.
