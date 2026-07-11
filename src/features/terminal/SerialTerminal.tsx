import { useEffect, useRef } from "react";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";

import { useSerial } from "@/useSerial";

const MAX_PENDING_OUTPUT = 64_000;
const WRITE_CHUNK_SIZE = 8_192;
const OUTPUT_DROPPED_NOTICE =
  "\r\n\x1b[33m── Terminal output dropped to keep the page responsive ──\x1b[0m\r\n";

export function SerialTerminal() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { state, subscribeTerminal, getTerminalBuffer, writeSerial } = useSerial();
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      convertEol: true,
      scrollback: 2_000,
      fontSize: 14,
      theme: {
        background: "#111111",
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    fitAddon.fit();

    let pendingOutput = "";
    let pendingClear: string | null = null;
    let writeInProgress = false;
    let disposed = false;

    const pumpOutput = () => {
      if (disposed || writeInProgress) return;

      const chunk = pendingClear ?? pendingOutput.slice(0, WRITE_CHUNK_SIZE);
      if (chunk.length === 0) return;

      if (pendingClear) {
        pendingClear = null;
      } else {
        pendingOutput = pendingOutput.slice(WRITE_CHUNK_SIZE);
      }
      writeInProgress = true;

      term.write(chunk, () => {
        writeInProgress = false;
        pumpOutput();
      });
    };

    const enqueueOutput = (incoming: string) => {
      // clear request should override inbound junk
      if (incoming.includes("\x1b[3J")) {
        pendingOutput = "";
        pendingClear = incoming;
        pumpOutput();
        return;
      }

      if (incoming.length >= MAX_PENDING_OUTPUT) {
        pendingOutput =
          OUTPUT_DROPPED_NOTICE +
          incoming.slice(-(MAX_PENDING_OUTPUT - OUTPUT_DROPPED_NOTICE.length));
      } else if (pendingOutput.length + incoming.length > MAX_PENDING_OUTPUT) {
        const retainedLength = MAX_PENDING_OUTPUT - OUTPUT_DROPPED_NOTICE.length;
        pendingOutput =
          OUTPUT_DROPPED_NOTICE +
          (pendingOutput + incoming).slice(-retainedLength);
      } else {
        pendingOutput += incoming;
      }

      pumpOutput();
    };

    const existing = getTerminalBuffer();
    if (existing) enqueueOutput(existing);

    const unsubscribe = subscribeTerminal(enqueueOutput);
    const resizeObserver = new ResizeObserver(() => fitAddon.fit());
    resizeObserver.observe(containerRef.current);

    const inputDisposable = term.onData((data) => {
      if (stateRef.current === "monitoring") {
        void writeSerial(data).catch((error) => {
          console.warn("Failed to write terminal input", error);
        });
      }
    });

    return () => {
      disposed = true;
      pendingOutput = "";
      pendingClear = null;
      inputDisposable.dispose();
      unsubscribe();
      resizeObserver.disconnect();
      term.dispose();
    };
  }, [getTerminalBuffer, subscribeTerminal, writeSerial]);

  return <div ref={containerRef} className="h-full" />;
}
