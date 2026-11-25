export interface NormalizedOption {
  optionText: string;
  optionOrder: number;
  isCorrect: boolean;
}

export interface NormalizedQuestion {
  externalQuestionId: string;
  orderIndex: number;
  questionText: string;
  questionType: string;
  correctAnswer: string;
  explanation: string;
  difficulty: string | null;
  options: NormalizedOption[];
}

export interface NormalizedChapter {
  chapterCode: string;
  title: string;
  description: string;
  category: string;
  instructions: string | null;
  questions: NormalizedQuestion[];
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return null;
}

function asLineText(value: unknown): string | null {
  if (Array.isArray(value)) {
    const lines = value
      .map((line) => asNonEmptyString(line))
      .filter((line): line is string => line !== null);
    return lines.length > 0 ? lines.join('\n') : null;
  }
  return asNonEmptyString(value);
}

function slugifyFileName(fileName: string): string {
  return fileName
    .replace(/\.json$/i, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function titleFromFileName(fileName: string): string {
  const base = fileName.replace(/\.json$/i, '').replace(/[_-]+/g, ' ').trim();
  if (!base) return 'Untitled Chapter';
  return base.replace(/\b\w/g, (c) => c.toUpperCase());
}

function extractFlatOptions(qObj: Record<string, unknown>): string[] | null {
  const keyGroups = [
    ['option_a', 'option_b', 'option_c', 'option_d', 'option_e'],
    ['optionA', 'optionB', 'optionC', 'optionD', 'optionE'],
    ['opt_a', 'opt_b', 'opt_c', 'opt_d', 'opt_e'],
    ['opt1', 'opt2', 'opt3', 'opt4', 'opt5'],
    ['option1', 'option2', 'option3', 'option4', 'option5'],
    ['A', 'B', 'C', 'D', 'E'],
  ];

  for (const keys of keyGroups) {
    const found = keys
      .map((k) => asNonEmptyString(qObj[k]))
      .filter((v): v is string => v !== null);
    if (found.length >= 2) {
      return found;
    }
  }
  return null;
}

function extractOptionsAndFlaggedAnswer(
  rawOptions: unknown,
  qObj: Record<string, unknown>
): { options: string[]; flaggedCorrect: string | null } {
  let flaggedCorrect: string | null = null;

  if (Array.isArray(rawOptions)) {
    const parsed: string[] = [];
    for (const item of rawOptions) {
      if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
        const s = String(item).trim();
        if (s) parsed.push(s);
      } else if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>;
        const text =
          asNonEmptyString(obj.text) ||
          asNonEmptyString(obj.option) ||
          asNonEmptyString(obj.label) ||
          asNonEmptyString(obj.value) ||
          asNonEmptyString(obj.t) ||
          '';
        if (text) {
          parsed.push(text);
          if (obj.isCorrect === true || obj.is_correct === true || obj.correct === true) {
            flaggedCorrect = text;
          }
        }
      }
    }
    if (parsed.length >= 1) {
      return { options: parsed, flaggedCorrect };
    }
  }

  if (rawOptions && typeof rawOptions === 'object' && !Array.isArray(rawOptions)) {
    const entries = Object.entries(rawOptions as Record<string, unknown>)
      .map(([, v]) => asNonEmptyString(v))
      .filter((v): v is string => v !== null);
    if (entries.length >= 2) {
      return { options: entries, flaggedCorrect };
    }
  }

  const flat = extractFlatOptions(qObj);
  if (flat) return { options: flat, flaggedCorrect };

  return { options: [], flaggedCorrect: null };
}

function resolveCorrectAnswerPermissive(
  rawCorrect: unknown,
  options: string[],
  flaggedCorrect: string | null,
  isIndexHint = false
): string {
  if (flaggedCorrect) return flaggedCorrect;

  if (rawCorrect === undefined || rawCorrect === null) {
    return options[0] ?? 'Not specified';
  }

  if (typeof rawCorrect === 'number' && Number.isInteger(rawCorrect)) {
    if (isIndexHint && rawCorrect >= 0 && rawCorrect < options.length) {
      return options[rawCorrect];
    }
    const exactMatch = options.find((o) => o === String(rawCorrect));
    if (exactMatch && rawCorrect >= options.length) {
      return exactMatch;
    }
    if (rawCorrect >= 0 && rawCorrect < options.length) {
      return exactMatch ?? options[rawCorrect];
    }
    if (exactMatch) return exactMatch;
    return String(rawCorrect);
  }

  const correctStr = asNonEmptyString(rawCorrect);
  if (!correctStr) {
    return options[0] ?? 'Not specified';
  }

  if (options.length === 0) {
    return correctStr;
  }

  const exact = options.find((o) => o === correctStr);
  if (exact) return exact;

  const caseInsensitive = options.find(
    (o) => o.toLowerCase() === correctStr.toLowerCase()
  );
  if (caseInsensitive) return caseInsensitive;

  if (/^[A-Za-z]$/.test(correctStr)) {
    const letterIdx = correctStr.toUpperCase().charCodeAt(0) - 65;
    if (letterIdx >= 0 && letterIdx < options.length) {
      return options[letterIdx];
    }
  }

  // Fallback: keep provided answer text even if it doesn't match option formatting
  return correctStr;
}

function buildExplanation(qObj: Record<string, unknown>): string {
  const direct =
    asLineText(qObj.explanation) ||
    asLineText(qObj.solution) ||
    asLineText(qObj.exp) ||
    asLineText(qObj.e) ||
    asLineText(qObj.rationale) ||
    asLineText(qObj.hint) ||
    asLineText(qObj.reason);
  if (direct) return direct;

  const sections: string[] = [];
  const normal = asLineText(qObj.n);
  const shortcut = asLineText(qObj.s);
  const concept = asLineText(qObj.c);

  if (normal) sections.push(`Solution:\n${normal}`);
  if (shortcut) sections.push(`Shortcut:\n${shortcut}`);
  if (concept) sections.push(`Concept: ${concept}`);

  return sections.join('\n\n');
}

function extractQuestionText(qObj: Record<string, unknown>): string | null {
  return (
    asLineText(qObj.question) ||
    asLineText(qObj.question_text) ||
    asLineText(qObj.questionText) ||
    asLineText(qObj.prompt) ||
    asLineText(qObj.stem) ||
    asLineText(qObj.statement) ||
    asLineText(qObj.query) ||
    asLineText(qObj.text) ||
    asLineText(qObj.t) ||
    asLineText(qObj.q)
  );
}

function isQuestionLikeObject(obj: Record<string, unknown>): boolean {
  // If it contains nested question arrays, it's a container/section/passage, not a leaf question
  if (Array.isArray(obj.questions) || Array.isArray(obj.qs) || Array.isArray(obj.q)) {
    return false;
  }
  const hasText = extractQuestionText(obj) !== null;
  if (!hasText) return false;

  const hasOptions =
    obj.options !== undefined ||
    obj.choices !== undefined ||
    obj.o !== undefined ||
    obj.opts !== undefined ||
    obj.option !== undefined ||
    obj.alternatives !== undefined ||
    extractFlatOptions(obj) !== null;

  const hasAnswer =
    obj.correct_answer !== undefined ||
    obj.correctAnswer !== undefined ||
    obj.answer !== undefined ||
    obj.ans !== undefined ||
    obj.a !== undefined ||
    obj.correct_option !== undefined ||
    obj.correctOption !== undefined ||
    obj.right_answer !== undefined ||
    obj.rightAnswer !== undefined;

  return hasOptions || hasAnswer;
}

function normalizeQuestionItem(
  qObj: Record<string, unknown>,
  orderIndex: number,
  passageContext?: string
): NormalizedQuestion {
  const rawQText = extractQuestionText(qObj) || `Question ${orderIndex}`;
  const questionText = passageContext
    ? `${passageContext}\n\nQuestion: ${rawQText}`
    : rawQText;

  const questionType =
    asNonEmptyString(qObj.question_type) ||
    asNonEmptyString(qObj.type) ||
    'mcq';

  const rawOptions =
    qObj.options ??
    qObj.choices ??
    qObj.o ??
    qObj.opts ??
    qObj.option ??
    qObj.alternatives;

  let { options: optionStrings, flaggedCorrect } = extractOptionsAndFlaggedAnswer(
    rawOptions,
    qObj
  );

  if (questionType.toLowerCase() === 'true_false' && optionStrings.length === 0) {
    optionStrings = ['True', 'False'];
  }

  const hasIndexHint = qObj.a !== undefined || qObj.ans !== undefined;
  const rawCorrect =
    qObj.correct_answer ??
    qObj.correctAnswer ??
    qObj.answer ??
    qObj.ans ??
    qObj.a ??
    qObj.correct_option ??
    qObj.correctOption ??
    qObj.right_answer ??
    qObj.rightAnswer;

  const correctAnswer = resolveCorrectAnswerPermissive(
    rawCorrect,
    optionStrings,
    flaggedCorrect,
    hasIndexHint
  );

  const explanation = buildExplanation(qObj);
  const difficulty =
    asNonEmptyString(qObj.difficulty) ||
    asNonEmptyString(qObj.lvl) ||
    asNonEmptyString(qObj.lv);

  const externalQuestionId =
    asNonEmptyString(qObj.question_id) ||
    asNonEmptyString(qObj.questionId) ||
    asNonEmptyString(qObj.id) ||
    String(orderIndex);

  return {
    externalQuestionId,
    orderIndex,
    questionText,
    questionType: optionStrings.length > 0 ? questionType.toLowerCase() : 'short_answer',
    correctAnswer,
    explanation,
    difficulty,
    options: optionStrings.map((optText, optIdx) => ({
      optionText: optText,
      optionOrder: optIdx + 1,
      isCorrect: optText === correctAnswer,
    })),
  };
}

function collectQuestionsRecursively(
  node: unknown,
  results: NormalizedQuestion[],
  inheritedContext?: string
): void {
  if (Array.isArray(node)) {
    for (const item of node) {
      collectQuestionsRecursively(item, results, inheritedContext);
    }
    return;
  }

  if (!node || typeof node !== 'object') {
    return;
  }

  const obj = node as Record<string, unknown>;

  if (isQuestionLikeObject(obj)) {
    results.push(normalizeQuestionItem(obj, results.length + 1, inheritedContext));
    return;
  }

  // Check if this container carries a passage/title context for its child questions
  const containerTitle =
    asNonEmptyString(obj.t) ||
    asNonEmptyString(obj.title) ||
    asNonEmptyString(obj.name);
  const containerPassage =
    asLineText(obj.p) ||
    asLineText(obj.passage) ||
    asLineText(obj.context) ||
    asLineText(obj.paragraph) ||
    asLineText(obj.directions);

  let nextContext = inheritedContext;
  if (containerPassage) {
    nextContext = containerTitle
      ? `[${containerTitle}]\n${containerPassage}`
      : containerPassage;
  }

  for (const [key, val] of Object.entries(obj)) {
    if (key === 'subs' || key === 'grid' || key === 'chk') continue;
    if (val && typeof val === 'object') {
      collectQuestionsRecursively(val, results, nextContext);
    }
  }
}

function normalizeChapterObject(
  root: Record<string, unknown>,
  originalFileName: string,
  indexSuffix?: number
): NormalizedChapter {
  const title =
    asNonEmptyString(root.title) ||
    asNonEmptyString(root.chapter_title) ||
    asNonEmptyString(root.chapterName) ||
    asNonEmptyString(root.name) ||
    titleFromFileName(originalFileName);

  const fallbackCode = slugifyFileName(originalFileName) || slugifyFileName(title);
  const baseCode =
    asNonEmptyString(root.chapter_id) ||
    asNonEmptyString(root.chapterId) ||
    asNonEmptyString(root.id) ||
    fallbackCode;

  const chapterCode =
    indexSuffix !== undefined && !root.chapter_id && !root.chapterId && !root.id
      ? `${baseCode}_${indexSuffix + 1}`
      : baseCode;

  const subs = Array.isArray(root.subs) ? root.subs : null;
  const subTopicNames = subs
    ? subs
        .map((s) =>
          s && typeof s === 'object'
            ? asNonEmptyString((s as Record<string, unknown>).short) ||
              asNonEmptyString((s as Record<string, unknown>).name)
            : null
        )
        .filter((x): x is string => x !== null)
    : [];

  const description =
    asNonEmptyString(root.description) ||
    asNonEmptyString(root.summary) ||
    (subTopicNames.length > 0
      ? `${subTopicNames.length} sub-topics: ${subTopicNames.join(', ')}`
      : '');

  const category =
    asNonEmptyString(root.category) ||
    asNonEmptyString(root.subject) ||
    asNonEmptyString(root.topic) ||
    (subs ? 'Quantitative Aptitude' : 'General');

  let instructions =
    asNonEmptyString(root.instructions) ||
    asNonEmptyString(root.instruction) ||
    asNonEmptyString(root.guidelines) ||
    null;

  if (!instructions && subs && subs.length > 0) {
    instructions = JSON.stringify({ subs });
  }

  const questions: NormalizedQuestion[] = [];
  collectQuestionsRecursively(root, questions);

  if (questions.length === 0) {
    throw new Error(
      `No questions could be extracted from "${originalFileName}".`
    );
  }

  return {
    chapterCode,
    title,
    description,
    category,
    instructions,
    questions,
  };
}

export function parseAndValidateChapterJsonMulti(
  rawText: string,
  originalFileName: string
): NormalizedChapter[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Syntax error';
    throw new Error(`Invalid JSON syntax in "${originalFileName}": ${msg}`);
  }

  if (Array.isArray(parsed)) {
    if (parsed.length === 0) {
      throw new Error(`JSON array in "${originalFileName}" is empty.`);
    }

    const first = parsed[0];
    if (first && typeof first === 'object' && !Array.isArray(first)) {
      const firstObj = first as Record<string, unknown>;

      // Puzzle-set array format: [{ t, lv, p, q, grid, sol }, ...]
      const looksLikePuzzleArray =
        typeof firstObj.t === 'string' &&
        Array.isArray(firstObj.p) &&
        Array.isArray(firstObj.q);

      if (looksLikePuzzleArray) {
        const allQuestions: NormalizedQuestion[] = [];
        const puzzleTitles: string[] = [];
        collectQuestionsRecursively(parsed, allQuestions);

        for (let i = 0; i < parsed.length; i++) {
          const item = parsed[i] as Record<string, unknown>;
          puzzleTitles.push(asNonEmptyString(item?.t) || `Puzzle ${i + 1}`);
        }

        if (allQuestions.length === 0) {
          throw new Error(`No questions found in "${originalFileName}".`);
        }

        return [
          {
            chapterCode: slugifyFileName(originalFileName) || 'puzzle_set',
            title: titleFromFileName(originalFileName),
            description: `${parsed.length} puzzles (${allQuestions.length} questions): ${puzzleTitles.join(' · ')}`,
            category: 'Reasoning Puzzles',
            instructions: JSON.stringify({ puzzles: parsed }),
            questions: allQuestions,
          },
        ];
      }

      // Multi-chapter array format: [{ title/name, questions/qs }, ...]
      const looksLikeChapterArray =
        Array.isArray(firstObj.questions) ||
        Array.isArray(firstObj.qs) ||
        Array.isArray(firstObj.sections) ||
        typeof firstObj.title === 'string' ||
        typeof firstObj.name === 'string';

      if (looksLikeChapterArray) {
        return parsed.map((item, idx) => {
          if (!item || typeof item !== 'object' || Array.isArray(item)) {
            throw new Error(`Chapter entry #${idx + 1} in "${originalFileName}" must be an object.`);
          }
          return normalizeChapterObject(
            item as Record<string, unknown>,
            originalFileName,
            parsed.length > 1 ? idx : undefined
          );
        });
      }
    }

    // Generic array of questions / nested sections
    const extracted: NormalizedQuestion[] = [];
    collectQuestionsRecursively(parsed, extracted);

    if (extracted.length === 0) {
      throw new Error(`No questions could be extracted from "${originalFileName}".`);
    }

    return [
      {
        chapterCode: slugifyFileName(originalFileName) || 'chapter',
        title: titleFromFileName(originalFileName),
        description: `Imported ${extracted.length} questions from ${originalFileName}`,
        category: 'General',
        instructions: null,
        questions: extracted,
      },
    ];
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error(
      `Invalid JSON in "${originalFileName}": Expected an object or array.`
    );
  }

  return [normalizeChapterObject(parsed as Record<string, unknown>, originalFileName)];
}

export function parseAndValidateChapterJson(
  rawText: string,
  originalFileName: string
): NormalizedChapter {
  return parseAndValidateChapterJsonMulti(rawText, originalFileName)[0];
}
