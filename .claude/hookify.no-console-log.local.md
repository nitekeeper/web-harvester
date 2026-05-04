---
name: no-console-log
enabled: true
event: file
conditions:
  - field: file_path
    operator: regex_match
    pattern: src/.*\.tsx?$
  - field: new_text
    operator: contains
    pattern: console.log(
action: warn
---

⚠️ **console.log detected in production source file**

`console.log` is forbidden in `src/` files. Use the scoped logger instead:

```typescript
import { createLogger } from '@shared/utils/logger';

const logger = createLogger('your-context-name');
logger.debug('message', { data });
logger.info('message');
logger.warn('message');
logger.error('message', error);
```

Remove the `console.log` and replace with `createLogger`.
