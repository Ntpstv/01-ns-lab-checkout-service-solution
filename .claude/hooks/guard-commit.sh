#!/bin/bash
# PreToolUse hook (matcher: Bash) — บล็อกคำสั่ง `git commit` ถ้า typecheck ยังแดง
set -euo pipefail
# -e: ถ้าคำสั่งไหน error ให้หยุดสคริปต์ทันที
# -u: ถ้าอ้าง env var ที่ไม่มีอยู่จริง ให้ error (กันพิมพ์ชื่อตัวแปรผิด)
# -o pipefail: ถ้าคำสั่งใน pipe (เช่น a | b) ตัวใดตัวหนึ่ง error ให้ทั้งไพป์ถือว่า error ด้วย

input=$(cat)
# อ่าน JSON ทั้งก้อนที่ Claude Code ส่งมาทาง stdin เก็บไว้ในตัวแปร input
# (ข้างในจะมี tool_name, tool_input.command ของคำสั่ง Bash ที่กำลังจะรัน)

command=$(printf '%s' "$input" | node -e "
let d = '';
process.stdin.on('data', c => (d += c));
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(d);
    process.stdout.write((data.tool_input && data.tool_input.command) || '');
  } catch (e) {}
});
")
# ส่ง input เข้า node เพื่อ parse JSON แล้วดึงเฉพาะ tool_input.command ออกมา
# (ใช้ node แทน jq เพราะเครื่องนี้ไม่มี jq ติดตั้งไว้)
# ถ้า parse ไม่ผ่านหรือไม่มี field นี้ จะได้ string ว่างกลับมา ไม่ error

if [ -z "$command" ]; then
  exit 0
fi
# ถ้าดึงคำสั่งออกมาไม่ได้ (ว่างเปล่า) ก็ไม่มีอะไรให้เช็ค อนุญาตผ่านไปเลย (exit 0 = allow)

# Only guard actual `git commit` invocations, not unrelated commands that merely
# mention the word (e.g. `git log --grep=commit`).
if ! printf '%s' "$command" | grep -Eq '(^|[;&|]|\()\s*git\s+commit\b'; then
  exit 0
fi
# เช็คด้วย regex ว่าคำสั่งนี้มี "git commit" อยู่จริงไหม (ต้องขึ้นต้นบรรทัด หรืออยู่หลัง ; & | ( เท่านั้น
# กันไม่ให้ไปแมตช์มั่วกับคำสั่งอื่นที่แค่มีคำว่า commit ปนอยู่ เช่น `git log --grep=commit`)
# ถ้า "ไม่ใช่" คำสั่ง git commit → อนุญาตผ่านทันที ไม่ต้องรัน typecheck ให้เสียเวลา

cd "$CLAUDE_PROJECT_DIR"
# ย้าย working directory ไปที่ root ของโปรเจกต์ก่อน (ตัวแปรนี้ Claude Code ส่งมาให้อัตโนมัติ)
# กันกรณี hook ถูกเรียกจากตำแหน่งอื่นแล้ว npm run typecheck หาไฟล์ package.json ไม่เจอ

typecheck_output=$(npm run typecheck 2>&1) && exit 0
# รัน `npm run typecheck` จริง เก็บทั้ง stdout+stderr ไว้ในตัวแปรเดียว
# ถ้าผ่าน (exit code 0) → exit 0 ทันที = อนุญาตให้ commit ต่อได้เลย
# ถ้าไม่ผ่าน โค้ดจะไหลต่อไปบรรทัดล่าง (เพราะ && ทำให้ set -e ไม่ตัดจบสคริปต์ตรงนี้)

message="typecheck failed — fix the type errors below before committing:

$(printf '%s' "$typecheck_output" | tail -n 40)"
# ประกอบข้อความแจ้งเตือน โดยตัด output ของ tsc ให้เหลือแค่ 40 บรรทัดสุดท้าย
# (กันข้อความยาวเกินไปถ้ามี error เยอะมาก)

printf '%s' "$message" | node -e "
let d = '';
process.stdin.on('data', c => (d += c));
process.stdin.on('end', () => {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { permissionDecision: 'deny' },
    systemMessage: d,
  }));
});
" >&2
# แปลงข้อความ message ให้เป็น JSON ที่ถูกต้อง (กัน quote/newline พังตอนเขียนเอง)
# แล้วพิมพ์ JSON นี้ออกทาง stderr — Claude Code จะอ่าน stderr นี้ไปโชว์ให้ Claude เห็นเหตุผลที่โดนบล็อก

exit 2
# exit code 2 = บล็อกคำสั่งนี้ไม่ให้รัน (deny) พร้อมส่งเหตุผลใน stderr กลับไปให้ Claude แก้ typecheck ก่อน แล้วค่อยลอง commit ใหม่
