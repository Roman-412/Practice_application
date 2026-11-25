export interface ClientValidationResult {
  valid: boolean;
  error?: string;
  chapterTitle?: string;
  questionCount?: number;
}

function asText(val: unknown): string | null {
  if (typeof val === 'string') {
    const t = val.trim();
    return t.length > 0 ? t : null;
  }
  if (typeof val === 'number' || typeof val === 'boolean') {
    return String(val);
  }
  if (Array.isArray(val) && val.length > 0) {
    return val.map((x) => String(x)).join('\n');
  }
  return null;
}

function isQuestionLike(obj: Record<string, unknown>): boolean {
  if (Array.isArray(obj.questions) || Array.isArray(obj.qs) || Array.isArray(obj.q)) {
    return false;
  }
  const hasText = Boolean(
    asText(obj.question) ||
      asText(obj.question_text) ||
      asText(obj.questionText) ||
      asText(obj.prompt) ||
      asText(obj.stem) ||
      asText(obj.statement) ||
      asText(obj.query) ||
      asText(obj.text) ||
      asText(obj.t) ||
      asText(obj.q)
  );
  if (!hasText) return false;

  const hasOptionsOrAnswer =
    obj.options !== undefined ||
    obj.choices !== undefined ||
    obj.o !== undefined ||
    obj.opts !== undefined ||
    obj.option !== undefined ||
    obj.alternatives !== undefined ||
    obj.option_a !== undefined ||
    obj.optionA !== undefined ||
    obj.opt1 !== undefined ||
    obj.A !== undefined ||
    obj.correct_answer !== undefined ||
    obj.correctAnswer !== undefined ||
    obj.answer !== undefined ||
    obj.ans !== undefined ||
    obj.a !== undefined ||
    obj.correct_option !== undefined;

  return hasOptionsOrAnswer;
}

function countQuestionsRecursively(node: unknown): number {
  if (Array.isArray(node)) {
    return node.reduce<number>((sum, item) => sum + countQuestionsRecursively(item), 0);
  }
  if (!node || typeof node !== 'object') return 0;

  const obj = node as Record<string, unknown>;
  if (isQuestionLike(obj)) return 1;

  let count = 0;
  for (const [k, v] of Object.entries(obj)) {
    if (k === 'subs' || k === 'grid' || k === 'chk') continue;
    if (v && typeof v === 'object') {
      count += countQuestionsRecursively(v);
    }
  }
  return count;
}

export async function validateChapterJsonFile(file: File): Promise<ClientValidationResult> {
  if (!file.name.toLowerCase().endsWith('.json')) {
    return {
      valid: false,
      error: 'Only .json files are supported.',
    };
  }

  let text: string;
  try {
    text = await file.text();
  } catch {
    return {
      valid: false,
      error: 'Unable to read file contents.',
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    return {
      valid: false,
      error: `Invalid JSON syntax: ${err instanceof Error ? err.message : 'Parse error'}`,
    };
  }

  if (!parsed || typeof parsed !== 'object') {
    return {
      valid: false,
      error: 'Root JSON value must be an object or array.',
    };
  }

  const questionCount = countQuestionsRecursively(parsed);
  if (questionCount === 0) {
    return {
      valid: false,
      error: 'No questions found in this JSON file.',
    };
  }

  let chapterTitle = file.name.replace(/\.json$/i, '').replace(/[_-]+/g, ' ').trim();
  if (!Array.isArray(parsed)) {
    const obj = parsed as Record<string, unknown>;
    const explicitTitle = obj.title || obj.chapter_title || obj.chapterName || obj.name;
    if (typeof explicitTitle === 'string' && explicitTitle.trim()) {
      chapterTitle = explicitTitle.trim();
    }
  } else if (parsed.length > 1 && typeof (parsed[0] as Record<string, unknown>)?.t === 'string') {
    chapterTitle = `${chapterTitle} (${parsed.length} sets)`;
  }

  return {
    valid: true,
    chapterTitle: chapterTitle || 'Chapter',
    questionCount,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
