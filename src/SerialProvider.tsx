import { useCallback, useRef, useState } from 'react';
import {
  ESPLoader,
  Transport,
  FlashOptions,
  FlashModeValues,
  FlashFreqValues,
  FlashSizeValues
} from "esptool-js";
import { SerialState, SerialContext } from './SerialContext';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function SerialProvider({ children }: { children: React.ReactNode }) {
  const portRef = useRef<SerialPort>(null);
  const transportRef = useRef<Transport | null>(null);
  const loaderRef = useRef<ESPLoader | null>(null);
  const stateRef = useRef<SerialState>("disconnected");
  const readerRef = useRef<ReadableStreamDefaultReader>(null);
  const terminalListenerRef = useRef(new Set<(chunk: string) => void>());
  const terminalBufferRef = useRef("");

  const [state, _setState] = useState<SerialState>("disconnected" as SerialState);
  const [boardModel, setBoardModel] = useState('Unknown');
  const [flashProgress, setFlashProgress] = useState('--%');

  function requireState(allowed: SerialState | SerialState[], action: string) {
    const list = Array.isArray(allowed) ? allowed: [allowed];
    if (!list.includes(stateRef.current)) {
      throw new Error(`${action} is not allowed while mode is "${stateRef.current}"`);
    }
  }

  const appendTerminal = useCallback((chunk: string) => {
    terminalBufferRef.current += chunk;

    // keep the replay buffer from growing forever
    if (terminalBufferRef.current.length > 200_000) {
      terminalBufferRef.current = terminalBufferRef.current.slice(-200_000);
    }

    for (const listener of terminalListenerRef.current) {
      listener(chunk);
    }
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
    appendTerminal("\x1bc");
  }, [appendTerminal]);

  const terminalInfo = useCallback((message: string) => {
    appendTerminal(`\r\n[system] ${message}\r\n`);
  }, [appendTerminal]);

  const setState = useCallback((next: SerialState) => {
    const prev = stateRef.current;
    stateRef.current = next;
    _setState(next);

    if (prev !== next) {
      terminalInfo(`${prev} -> ${next}`);
    }
  }, [terminalInfo]);

  const resetToLilota = useCallback(async() => {
    const port = portRef.current;
    if (!port) return;
    // go to POWERON_RESET + SPI_FAST_FLASH_BOOT mode
    await port.setSignals({ dataTerminalReady: false, requestToSend: false });
    await sleep(100);
    await port.setSignals({ dataTerminalReady: false, requestToSend: true });
    await sleep(100);
    await port.setSignals({ dataTerminalReady: false, requestToSend: false });
    await sleep(100);
  }, []);

  const connectPort = useCallback(async() => {
    requireState("disconnected", "connectPort")
    try {
      setState("connecting");
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 115200 });
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

    if (!port?.readable) {
      throw new Error("Port is not readable");
    }

    const reader = port.readable.getReader();
    readerRef.current = reader;

    const decoder = new TextDecoder();
    setState("monitoring");

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!value) continue;

        const text = decoder.decode(value, { stream: true });
        // TODO: better logger
        // console.log(text);
        appendTerminal(text);
      }
    } finally {
      reader.releaseLock();
      readerRef.current = null;

      if (stateRef.current === "monitoring") {
        setState("ready");
      }
    }
  }, [appendTerminal, setState]);

  const writeSerial = useCallback(async (data: string) => {
    requireState("monitoring", "writeSerial");

    const port = portRef.current;
    if (!port?.writable) {
      throw new Error("Port is not writeable");
    }

    const writer = port.writable.getWriter();

    try {
      const encoded = new TextEncoder().encode(data);
      await writer.write(encoded);
    } finally {
      writer.releaseLock();
    }
  }, []);

  const stopSerialMonitor = useCallback(async () => {
    requireState("monitoring", "stopSerialMonitor");

    await readerRef.current?.cancel();
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

    await port.close();
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
        await readerRef.current?.cancel();
      }

      await port.close();
    } catch (err) {
      setState("ready");
      throw err;
    }
  }, [setState])

  const flashLilota = useCallback(async() => {
    requireState(["ready", "monitoring"], "flashLilota");

    const port = portRef.current;
    if (!port) {
      throw new Error("No port connected");
    }

    try {
      await releaseSerialPort();

      setState("esptool");

      const transport = new Transport(port, true);
      transportRef.current = transport;

      const loader = new ESPLoader({
        transport,
        baudrate: 115200,
        terminal: {
          clean() {
            appendTerminal("\r\n[esptool] ------------------------------\r\n");
          },
          writeLine(text: string) {
            appendTerminal(`[esptool] ${text}\r\n`);
          },
          write(text: string) {
            appendTerminal(text);
          },
        },
      });

      loaderRef.current = loader;

      const boardModelTmp = await loader.main();
      setBoardModel(boardModelTmp);

      setState("flashing");

      const firmwareResponse = await fetch("/lilota/lilota-webflash.bin");

      if (!firmwareResponse.ok) {
        throw new Error(`Failed to load firmware: ${firmwareResponse.status}`);
      }

      const firmware = new Uint8Array(await firmwareResponse.arrayBuffer());

      if (firmware.length === 0) {
        throw new Error("Firmware file is empty");
      }

      const flashOptions: FlashOptions = {
        fileArray: [
          { data: firmware, address: 0x00 }
        ],
        flashMode: "keep" as FlashModeValues,
        flashFreq: "keep" as FlashFreqValues,
        flashSize: "4MB" as FlashSizeValues,
        eraseAll: true, // TODO: make a checkbox
        compress: true,
        reportProgress: (_, written, total) => {
          const percent = (written / total) * 100;
          setFlashProgress(`${percent}%`);
        }
      }

      await loader.writeFlash(flashOptions);

      setState("handoff");

      await loader.after("hard_reset");
      await sleep(150);
      await transport.disconnect();

      transportRef.current = null;
      loaderRef.current = null;

      await port.open({ baudRate: 115200 });

      setState("ready");
      await resetToLilota();
      await startSerialMonitor();
    } catch (err) {
      try {
        await transportRef.current?.disconnect();
      } catch (error) {
        console.warn("Failed to disconnect transport during cleanup", error);
      }

      transportRef.current = null;
      loaderRef.current = null;

      try {
        await port.open({ baudRate: 115200 });
        setState("ready");
      } catch (error) {
        console.warn("Failed to reopen serial port after flash fail", error);
        setState("disconnected");
      }

      throw err;
    }
  }, [appendTerminal, releaseSerialPort, resetToLilota, setState, startSerialMonitor]);

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