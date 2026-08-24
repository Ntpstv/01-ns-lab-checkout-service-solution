#!/usr/bin/env node
// PreToolUse hook (matcher: Edit|Write) — บล็อกการเขียน/แก้ไฟล์ .ts ถ้าเนื้อหาที่ "กำลังจะเขียน" มี type error
// ทำงานก่อนไฟล์จริงจะถูกแก้ (ต่างจาก guard-commit.sh ที่เช็คตอน commit ซึ่งช้ากว่า)
// หลักการ: ใช้ TypeScript compiler API สร้าง Program แบบ "virtual" โดยสลับเนื้อหาไฟล์เป้าหมาย
// เป็นเนื้อหาที่ Claude กำลังจะเขียน โดยยังไม่แตะไฟล์จริงบน disk เลย

const fs = require('fs');
const path = require('path');

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.on('data', (c) => (data += c));
    process.stdin.on('end', () => resolve(data));
  });
}

function deny(message) {
  process.stderr.write(
    JSON.stringify({
      hookSpecificOutput: { permissionDecision: 'deny' },
      systemMessage: message,
    }),
  );
  process.exit(2);
}

async function main() {
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const raw = await readStdin();

  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0); // parse ไม่ได้ ก็ไม่มีอะไรให้เช็ค ปล่อยผ่าน
  }

  const toolName = input.tool_name;
  const toolInput = input.tool_input || {};
  const filePath = toolInput.file_path;

  if (!filePath || (toolName !== 'Edit' && toolName !== 'Write')) {
    process.exit(0); // ไม่ใช่การแก้/เขียนไฟล์ ไม่เกี่ยวกับ hook นี้
  }
  if (!/\.tsx?$/.test(filePath)) {
    process.exit(0); // เช็คเฉพาะไฟล์ .ts / .tsx เท่านั้น
  }

  const absFilePath = path.resolve(projectDir, filePath);

  // ประกอบ "เนื้อหาที่กำลังจะถูกเขียนจริง" ตามชนิดของ tool
  let proposedContent;
  if (toolName === 'Write') {
    proposedContent = toolInput.content ?? '';
  } else {
    // Edit: ต้องอ่านไฟล์ปัจจุบันแล้วจำลองการแทนที่ old_string -> new_string เอง
    let currentContent;
    try {
      currentContent = fs.readFileSync(absFilePath, 'utf8');
    } catch {
      process.exit(0); // อ่านไฟล์เดิมไม่ได้ ปล่อยให้ Edit tool ตัวจริงจัดการ error เอง
    }
    const oldString = toolInput.old_string ?? '';
    const newString = toolInput.new_string ?? '';
    if (!oldString || !currentContent.includes(oldString)) {
      process.exit(0); // old_string หาไม่เจอ ปล่อยให้ Edit tool ตัวจริง error เอง ไม่ใช่หน้าที่ hook นี้
    }
    proposedContent = toolInput.replace_all
      ? currentContent.split(oldString).join(newString)
      : currentContent.replace(oldString, newString);
  }

  let ts;
  try {
    ts = require(path.join(projectDir, 'node_modules', 'typescript'));
  } catch {
    process.exit(0); // ไม่มี typescript ติดตั้งไว้ ก็เช็คไม่ได้ ปล่อยผ่าน (fail-open)
  }

  try {
    const configPath = ts.findConfigFile(projectDir, ts.sys.fileExists, 'tsconfig.json');
    if (!configPath) {
      process.exit(0);
    }
    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
    const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, projectDir);

    const rootNames = parsed.fileNames.includes(absFilePath)
      ? parsed.fileNames
      : [...parsed.fileNames, absFilePath];

    const host = ts.createCompilerHost(parsed.options);

    // สลับ "แหล่งที่มา" ของไฟล์เป้าหมายให้เป็นเนื้อหาที่ยังไม่ถูกเขียนจริง
    // (override ทั้ง getSourceFile และ fileExists เพราะไฟล์ใหม่ที่ยังไม่มีบน disk ก็ต้องเช็คได้ด้วย)
    const originalGetSourceFile = host.getSourceFile.bind(host);
    host.getSourceFile = (
      fileName,
      languageVersionOrOptions,
      onError,
      shouldCreateNewSourceFile,
    ) => {
      if (path.resolve(fileName) === absFilePath) {
        return ts.createSourceFile(fileName, proposedContent, languageVersionOrOptions, true);
      }
      return originalGetSourceFile(
        fileName,
        languageVersionOrOptions,
        onError,
        shouldCreateNewSourceFile,
      );
    };
    const originalFileExists = host.fileExists.bind(host);
    host.fileExists = (fileName) =>
      path.resolve(fileName) === absFilePath ? true : originalFileExists(fileName);

    const program = ts.createProgram({ rootNames, options: parsed.options, host });
    const sourceFile = program.getSourceFile(absFilePath);
    const diagnostics = ts
      .getPreEmitDiagnostics(program, sourceFile)
      .filter((d) => d.category === ts.DiagnosticCategory.Error);

    if (diagnostics.length === 0) {
      process.exit(0); // เขียว ให้ทำต่อได้เลย
    }

    const formatted = ts.formatDiagnostics(diagnostics, {
      getCurrentDirectory: () => projectDir,
      getCanonicalFileName: (f) => f,
      getNewLine: () => '\n',
    });

    deny(
      `type error ในเนื้อหาที่กำลังจะเขียน (${path.relative(projectDir, absFilePath)}) — แก้ก่อนถึงจะเขียนไฟล์ได้:\n\n${formatted}`,
    );
  } catch (err) {
    // hook เองมีปัญหา (เช่น tsconfig พัง) ไม่ควรบล็อกงานทั้งหมด ปล่อยผ่านแบบ fail-open
    process.exit(0);
  }
}

main();
