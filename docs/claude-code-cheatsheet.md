# Claude Code — session command cheat sheet

Quick reference for the built-in `/` commands that manage the session itself (not skills, not project commands).

| Command | What it does | Use it when... | เหมาะใช้ตอนไหน |
|---|---|---|---|
| `/diff` | Shows the current working-tree diff — the uncommitted changes in your repo. | You want to eyeball what's actually changed before committing, asking for `/code-review`, or opening a PR. | ก่อน commit หรือก่อนขอ `/code-review` — เช็คว่าเปลี่ยนอะไรไปบ้าง |
| `/compact` | Manually summarizes the conversation so far to free up context window space. | The session normally auto-compacts as it fills, but you want to trigger it now — e.g. right before a big task, or after a noisy debugging detour you don't need full detail on anymore. | ก่อนเริ่มงานใหญ่ที่ต้องการ context เต็มๆ หรือหลังจาก debug วนไปมาจนบทสนทนายาว แต่รายละเอียดเก่าไม่จำเป็นแล้ว |
| `/context` | Breaks down what's consuming the context window: system prompt, tool definitions, loaded files, conversation history. | Things feel sluggish or you're curious why context is filling fast — helps you see if it's your files, tool schemas, or chat history. | ตอนรู้สึกว่า context เต็มเร็วผิดปกติ อยากรู้ว่าอะไรกินพื้นที่ |
| `/model` | Switches which model is driving the session (e.g. Sonnet 5, Opus 4.8, Haiku 4.5, Fable 5). | You want more reasoning power for a hard problem, or a cheaper/faster model for routine work. | งานยากต้องการพลังคิดเยอะ → สลับไป Opus, งานง่ายทำซ้ำๆ ต้องการเร็ว/ถูก → สลับไป Haiku |
| `/effort` | Sets the reasoning effort level (low / medium / high / xhigh) for models that support it. | You want to dial reasoning depth up for a gnarly bug, or down for quick, cheap responses. | บั๊กซับซ้อนอยากให้คิดลึกขึ้น → เพิ่ม effort, งานง่ายอยากได้คำตอบเร็ว → ลด effort |
| `/clear` | Wipes the conversation history and starts fresh (project context like CLAUDE.md still loads on the next turn). | You're switching to a completely unrelated task and don't want old conversation biasing responses or eating context. | เปลี่ยนไปทำงานคนละเรื่องเลย ไม่อยากให้บทสนทนาเก่ามากวนหรือกิน context |
| `/rewind` | Restores file state and/or the conversation to an earlier checkpoint, undoing edits made since then. | An edit went wrong or a change needs to be undone without manually reverting each file by hand. | แก้โค้ดพลาดแล้วอยาก undo โดยไม่ต้อง revert เองทีละไฟล์ |
| `/cost` | Shows cumulative token usage / cost for the current session. | You want a sanity check on spend, especially in a long session. | เช็คงบตอนทำงาน session ยาวๆ |

## Rough mental model
- **Housekeeping** (context/cost hygiene): `/compact`, `/context`, `/clear`, `/cost`
- **Model tuning**: `/model`, `/effort`
- **Undo / review changes**: `/diff`, `/rewind`
