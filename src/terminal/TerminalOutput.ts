const MAX_REPLAY_CHARS = 100_000;
const MAX_CURRENT_LINE_CHARS = 4_096;
const MAX_DELIVERY_CHARS = 64_000;
const CLEAR_SEQUENCE = "\x1b[2J\x1b[3J\x1b[H";
const ANSI_RESET = "\x1b[0m";

const ANSI_COLORS = {
  info: "\x1b[38;5;75m",
  output: "\x1b[36m",
  error: "\x1b[31m",
  warning: "\x1b[33m",
} as const;

export type TerminalTone = keyof typeof ANSI_COLORS;
export type TerminalListener = (chunk: string) => void;
type LinePredicate = (line: string) => boolean;

type LineWaiter = {
  predicate: LinePredicate;
  resolve: () => void;
  reject: (error: Error) => void;
  timeoutId: ReturnType<typeof setTimeout>;
};

export function formatTerminalSeparator(
  message: string,
  tone: TerminalTone = "info",
) {
  return `\r\n${ANSI_COLORS[tone]}── ${message} ──${ANSI_RESET}\r\n`;
}

function formatTerminalText(text: string, tone: TerminalTone) {
  return `${ANSI_COLORS[tone]}${text}${ANSI_RESET}`;
}

export class TerminalOutput {
  private replayBuffer = "";
  private currentLine = "";
  private readonly listeners = new Set<TerminalListener>();
  private readonly lineWaiters = new Set<LineWaiter>();

  append(chunk: string) {
    const retainedChunk = chunk.slice(-MAX_REPLAY_CHARS);
    this.replayBuffer =
      (this.replayBuffer + retainedChunk).slice(-MAX_REPLAY_CHARS);
    this.updateCurrentLine(retainedChunk);
    this.resolveMatchingLineWaiters();

    const deliveredChunk = chunk.length > MAX_DELIVERY_CHARS
      ? formatTerminalSeparator("Oversized terminal output truncated", "warning") +
        chunk.slice(-MAX_DELIVERY_CHARS)
      : chunk;

    this.emit(deliveredChunk);
  }

  appendSeparator(message: string, tone: TerminalTone = "info") {
    this.append(formatTerminalSeparator(message, tone));
  }

  appendStyled(text: string, tone: TerminalTone) {
    this.append(formatTerminalText(text, tone));
  }

  subscribe(listener: TerminalListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getReplayBuffer() {
    return this.replayBuffer;
  }

  clear() {
    this.replayBuffer = CLEAR_SEQUENCE;
    this.currentLine = "";
    this.emit(CLEAR_SEQUENCE);
  }

  resetCurrentLine() {
    this.currentLine = "";
  }

  cancelLineWaiters(message: string) {
    for (const waiter of this.lineWaiters) {
      clearTimeout(waiter.timeoutId);
      this.lineWaiters.delete(waiter);
      waiter.reject(new Error(message));
    }
  }

  async waitForLine(
    predicate: LinePredicate,
    timeoutMs: number,
    timeoutMessage: string,
  ) {
    if (predicate(this.currentLine)) return;

    await new Promise<void>((resolve, reject) => {
      const waiter: LineWaiter = {
        predicate,
        resolve,
        reject,
        timeoutId: setTimeout(() => {
          this.lineWaiters.delete(waiter);
          reject(new Error(timeoutMessage));
        }, timeoutMs),
      };

      this.lineWaiters.add(waiter);
    });
  }

  private updateCurrentLine(chunk: string) {
    const combinedLine =
      (this.currentLine + chunk).slice(-MAX_CURRENT_LINE_CHARS);
    const lastLineBreak = Math.max(
      combinedLine.lastIndexOf("\r"),
      combinedLine.lastIndexOf("\n"),
    );

    this.currentLine = lastLineBreak === -1
      ? combinedLine
      : combinedLine.slice(lastLineBreak + 1);
  }

  private resolveMatchingLineWaiters() {
    for (const waiter of this.lineWaiters) {
      if (!waiter.predicate(this.currentLine)) continue;

      clearTimeout(waiter.timeoutId);
      this.lineWaiters.delete(waiter);
      waiter.resolve();
    }
  }

  private emit(chunk: string) {
    for (const listener of this.listeners) {
      listener(chunk);
    }
  }
}
