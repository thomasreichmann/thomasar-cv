---
title: Code Conventions
status: active
tags:
    - ai
    - conventions
ai_summary: 'Code conventions for thomasar-cv. Comments explain WHY, not WHAT.'
---

# Code Conventions

Terse reference for anyone (human or agent) writing code here.

## Comments

Comments explain WHY, not WHAT. The code already says what it does. A comment
earns its place by capturing the thing you cannot see in the code: a constraint,
a gotcha, a non-obvious behavior, or the reason a choice was made.

If a comment restates the line below it, delete it. If it would stop the next
person from "simplifying" away something load-bearing, keep it. When unsure, keep
the comment and sharpen it to the why.

```typescript
// Good - a constraint you cannot read off the code
// The Supabase transaction-mode pooler (port 6543) does not support prepared
// statements: statements can land on different pooled backends and intermittently
// lose transactions. Callers on a direct connection can override.
prepare: false;

// Good - non-obvious behavior the reader needs warned about
// A jump back UP the page (y increases) by more than ~half a line means reading
// order left a column and resumed higher up: column interleave an ATS reads out of order.
if (y - lastY > lineHeight / 2) { ... }

// Bad - restates the code
// Set isUploading to true
setIsUploading(true);

// Bad - section-divider noise
// ---- helpers ----
```
