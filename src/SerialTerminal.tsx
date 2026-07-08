import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { useSerial } from "./useSerial";

export function SerialTerminal() {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const termRef = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);

    const { state, subscribeTerminal, getTerminalBuffer, writeSerial } = useSerial();

    useEffect(() => {
        if (!containerRef.current) return;

        const term = new Terminal({
            cursorBlink: true,
            convertEol: true,
            scrollback: 5000,
            fontSize: 14,
            theme: {
                background: "#111111",
            },
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        term.open(containerRef.current);
        fitAddon.fit();

        const existing = getTerminalBuffer();
        if (existing) {
            term.write(existing);
        }

        termRef.current = term;
        fitAddonRef.current = fitAddon;

        const unsubscribe = subscribeTerminal((chunk) => {
            term.write(chunk);
        });

        const resizeObserver = new ResizeObserver(() => {
            fitAddon.fit();
        });
        resizeObserver.observe(containerRef.current);

        const disposable = term.onData((data) => {
            if (state === "monitoring") {
                void writeSerial(data);
            }
        });

        return () => {
            disposable.dispose();
            unsubscribe();
            resizeObserver.disconnect();
            term.dispose();
            termRef.current = null;
            fitAddonRef.current = null;
        };
    }, [getTerminalBuffer, subscribeTerminal, state, writeSerial]);
    return <div ref={containerRef}/>;
}
