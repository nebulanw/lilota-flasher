import { useCallback, useRef, useState } from 'react';
import { SerialState, SerialContext } from './SerialContext';
import type { FlashRequest } from './types/flash';
import { loadDefaultFirmware } from './services/firmware';
import { configureLilotaWifi, isLilotaPrompt } from './services/lilotaCommands';
import { EspToolSession } from './services/espTool';
import {
  closeSerialPort,
  openSerialPort,
  requestAndOpenSerialPort,
  resetEsp32,
  SerialMonitor,
  writeSerialData,
} from './services/webSerial';

const MAX_TERMINAL_BUFFER_CHARS = 100_000;
const MAX_TERMINAL_LINE_CHARS = 4_096;
const MAX_TERMINAL_DELIVERY_CHARS = 64_000;
const CLEAR_TERMINAL_SEQUENCE = "\x1b[2J\x1b[3J\x1b[H";
const ANSI_RESET = "\x1b[0m";
const ANSI_BLUE = "\x1b[38;5;75m";
const ANSI_CYAN = "\x1b[36m";
const ANSI_RED = "\x1b[31m";
const ANSI_YELLOW = "\x1b[33m";

const SERIAL_STATE_LABELS: Record<SerialState, string> = {
  disconnected: "Disconnected",
  connecting: "Connecting",
  ready: "Ready",
  monitoring: "Monitoring",
  "flash-prepare": "Preparing flash",
  esptool: "Bootloader",
  flashing: "Flashing",
  handoff: "Restoring serial",
};

function terminalSeparator(message: string, color = ANSI_BLUE) {
  return `\r\n${color}── ${message} ──${ANSI_RESET}\r\n`;
}

export function SerialProvider({ children }: { children: React.ReactNode }) {
  const portRef = useRef<SerialPort>(null);
  const espToolSessionRef = useRef<EspToolSession | null>(null);
  const stateRef = useRef<SerialState>("disconnected");
  const terminalListenerRef = useRef(new Set<(chunk: string) => void>());
  const terminalBufferRef = useRef("");
  const serialMonitorRef = useRef<SerialMonitor | null>(null);
  const latestTerminalLineRef = useRef("");
  const promptWaitersRef = useRef(new Set<() => void>());

  const [state, _setState] = useState<SerialState>("disconnected" as SerialState);
  const [boardModel, setBoardModel] = useState('Unknown');
  const [flashProgress, setFlashProgress] = useState(0);

  function requireState(allowed: SerialState | SerialState[], action: string) {
    const list = Array.isArray(allowed) ? allowed: [allowed];
    if (!list.includes(stateRef.current)) {
      throw new Error(`${action} is not allowed while mode is "${stateRef.current}"`);
    }
  }

  const appendTerminal = useCallback((chunk: string) => {
    const retainedChunk = chunk.slice(-MAX_TERMINAL_BUFFER_CHARS);
    terminalBufferRef.current =
      (terminalBufferRef.current + retainedChunk).slice(-MAX_TERMINAL_BUFFER_CHARS);

    const combinedLine =
      (latestTerminalLineRef.current + retainedChunk).slice(-MAX_TERMINAL_LINE_CHARS);
    const lastLineBreak = Math.max(
      combinedLine.lastIndexOf("\r"),
      combinedLine.lastIndexOf("\n")
    );

    latestTerminalLineRef.current =
      lastLineBreak === -1 ? combinedLine : combinedLine.slice(lastLineBreak + 1);

    if (isLilotaPrompt(latestTerminalLineRef.current)) {
      for (const resolve of promptWaitersRef.current) {
        resolve();
      }

      promptWaitersRef.current.clear();
    }

    const deliveredChunk = chunk.length > MAX_TERMINAL_DELIVERY_CHARS
      ? terminalSeparator("Oversized terminal output truncated", ANSI_YELLOW) +
        chunk.slice(-MAX_TERMINAL_DELIVERY_CHARS)
      : chunk;

    for (const listener of terminalListenerRef.current) {
      listener(deliveredChunk);
    }
  }, []);

  const waitForLilotaPrompt = useCallback(async () => {
    requireState("monitoring", "waitForLilotaPrompt");

    if (isLilotaPrompt(latestTerminalLineRef.current)) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const resolveWaiter = () => {
        window.clearTimeout(timeoutId);
        resolve();
      };

      const timeoutId = window.setTimeout(() => {
        promptWaitersRef.current.delete(resolveWaiter);
        reject(new Error("Timed out waiting for Lilota prompt"));
      }, 15_000);

      promptWaitersRef.current.add(resolveWaiter);
    })
  }, []);

  const subscribeTerminal = useCallback((listener: (chunk: string) => void) => {
    terminalListenerRef.current.add(listener);
    return () => {
      terminalListenerRef.current.delete(listener);
    };
  }, []);

  const getTerminalBuffer = useCallback(() => {
    return terminalBufferRef.current;
  }, []);

  const clearTerminalBuffer = useCallback(() => {
    terminalBufferRef.current = "";
    latestTerminalLineRef.current = "";
    appendTerminal(CLEAR_TERMINAL_SEQUENCE);
  }, [appendTerminal]);

  const setState = useCallback((next: SerialState) => {
    const prev = stateRef.current;
    stateRef.current = next;
    _setState(next);

    if (prev !== next) {
      appendTerminal(terminalSeparator(
        `${SERIAL_STATE_LABELS[prev]} → ${SERIAL_STATE_LABELS[next]}`
      ));
    }
  }, [appendTerminal]);

  const resetToLilota = useCallback(async() => {
    requireState(["ready", "monitoring"], "resetToLilota");

    const port = portRef.current;
    if (!port) {
      throw new Error("No port connected");
    }
    await resetEsp32(port);
  }, []);

  const connectPort = useCallback(async() => {
    requireState("disconnected", "connectPort")
    try {
      setState("connecting");
      const port = await requestAndOpenSerialPort();
      portRef.current = port;
      setState("ready");
    } catch (error) {
      setState("disconnected");
      throw error;
    }
  }, [setState]);

  const startSerialMonitor = useCallback(async () => {
    requireState("ready", "startSerialMonitor");

    const port = portRef.current;

    if (!port) {
      throw new Error("No port connected");
    }

    const monitor = new SerialMonitor(port, appendTerminal);
    serialMonitorRef.current = monitor;
    setState("monitoring");

    void monitor.completed.then(
      () => undefined,
      (error) => {
        const message = error instanceof Error ? error.message : String(error);
        appendTerminal(terminalSeparator(`Serial monitor failed: ${message}`, ANSI_RED));
      },
    ).finally(() => {
      if (serialMonitorRef.current === monitor) {
        serialMonitorRef.current = null;
      }

      if (stateRef.current === "monitoring") {
        setState("ready");
      }
    });
  }, [appendTerminal, setState]);

  const writeSerial = useCallback(async (data: string) => {
    requireState("monitoring", "writeSerial");

    const port = portRef.current;
    if (!port) {
      throw new Error("No port connected");
    }

    await writeSerialData(port, data);
  }, []);

  const stopSerialMonitor = useCallback(async () => {
    requireState("monitoring", "stopSerialMonitor");

    await serialMonitorRef.current?.stop();
  }, []);

  const disconnectPort = useCallback(async() => {
    // TODO: Handle esptool state if it can be entered separately from flashing
    requireState(["ready", "monitoring"], "disconnectPort");

    const port = portRef.current;
    if (!port) {
      setState("disconnected");
      return;
    }

    if (stateRef.current === "monitoring") {
      await stopSerialMonitor();
    }

    await closeSerialPort(port);
    portRef.current = null;

    setState("disconnected");
  }, [setState, stopSerialMonitor]);

  const releaseSerialPort = useCallback(async() => {
    requireState(["ready", "monitoring"], "releaseSerialPort");

    const port = portRef.current;
    if (!port) {
      throw new Error("No port available");
    }

    const previousState = stateRef.current;
    setState("flash-prepare");

    try {
      if (previousState === "monitoring") {
        await serialMonitorRef.current?.stop();
      }

      await closeSerialPort(port);
    } catch (err) {
      setState("ready");
      throw err;
    }
  }, [setState])

  const flashLilota = useCallback(async(request: FlashRequest) => {
    requireState(["ready", "monitoring"], "flashLilota");

    const port = portRef.current;
    if (!port) {
      throw new Error("No port connected");
    }

    if (request.wifi) {
      if (!request.wifi.ssid.trim()) {
        throw new Error("A Wi-Fi SSID is required");
      }

      if (request.wifi.security === "wpa2-personal" && !request.wifi.password) {
        throw new Error("A password is required for WPA2-Personal networks");
      }
    }

    setFlashProgress(0);
    let rawSerialRestored = false;

    try {
      await releaseSerialPort();

      setState("esptool");

      const espToolSession = new EspToolSession(port, {
        clean() {
          appendTerminal(terminalSeparator("Esptool output", ANSI_CYAN));
        },
        writeLine(text: string) {
          appendTerminal(`${ANSI_CYAN}${text}${ANSI_RESET}\r\n`);
        },
        write(text: string) {
          appendTerminal(`${ANSI_CYAN}${text}${ANSI_RESET}`);
        },
      });
      espToolSessionRef.current = espToolSession;

      const boardModelTmp = await espToolSession.connect();
      setBoardModel(boardModelTmp);

      setState("flashing");

      const firmware = await loadDefaultFirmware();

      await espToolSession.writeFirmware(firmware, {
        eraseAll: request.eraseFlash,
        onProgress: setFlashProgress,
      });

      setState("handoff");

      await espToolSession.resetAndDisconnect();
      espToolSessionRef.current = null;

      await openSerialPort(port);
      rawSerialRestored = true;

      setState("ready");
      latestTerminalLineRef.current = "";
      await resetToLilota();
      await startSerialMonitor();

      if (request.wifi) {
        await waitForLilotaPrompt();
        await configureLilotaWifi(writeSerial, request.wifi);
      }
    } catch (err) {
      if (!rawSerialRestored) {
        try {
          await espToolSessionRef.current?.disconnect();
        } catch (error) {
          console.warn("Failed to disconnect esptool during cleanup", error);
        }

        espToolSessionRef.current = null;

        try {
          await openSerialPort(port);
          setState("ready");
        } catch (error) {
          console.warn("Failed to reopen serial port after flash fail", error);
          portRef.current = null;
          setState("disconnected");
        }
      }

      throw err;
    }
  }, [appendTerminal, releaseSerialPort, resetToLilota, setState, startSerialMonitor, waitForLilotaPrompt, writeSerial]);

  return (
    <SerialContext.Provider value={{
      boardModel,
      flashProgress,
      connectPort,
      disconnectPort,
      startSerialMonitor,
      stopSerialMonitor,
      flashFirmware: flashLilota,
      resetToLilota,
      subscribeTerminal,
      getTerminalBuffer,
      clearTerminalBuffer,
      writeSerial,
      state
    }}>
      {children}
    </SerialContext.Provider>
  )
}
