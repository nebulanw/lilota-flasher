import { useCallback, useRef, useState } from 'react';
import { SerialState, SerialContext } from './SerialContext';
import type { FlashRequest } from './types/flash';
import { loadDefaultFirmware } from './services/firmware';
import { configureLilotaWifi, isLilotaPrompt } from './services/lilotaCommands';
import { EspToolSession } from './services/espTool';
import {
  closeSerialPort,
  openSerialPort,
  requestSerialPort,
  resetEsp32,
  SerialMonitor,
  writeSerialData,
} from './services/webSerial';
import type { DeviceInfo } from './types/device';
import { TerminalOutput } from './terminal/TerminalOutput';

const SERIAL_STATE_LABELS: Record<SerialState, string> = {
  disconnected: "Disconnected",
  connecting: "Connecting",
  detecting: "Detecting device",
  ready: "Ready",
  monitoring: "Monitoring",
  "flash-prepare": "Preparing flash",
  esptool: "Bootloader",
  flashing: "Flashing",
  handoff: "Restoring serial",
};

export function SerialProvider({ children }: { children: React.ReactNode }) {
  const portRef = useRef<SerialPort>(null);
  const espToolSessionRef = useRef<EspToolSession | null>(null);
  const stateRef = useRef<SerialState>("disconnected");
  const serialMonitorRef = useRef<SerialMonitor | null>(null);

  const [state, _setState] = useState<SerialState>("disconnected" as SerialState);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [flashProgress, setFlashProgress] = useState(0);
  const [terminalOutput] = useState(() => new TerminalOutput());

  function requireState(allowed: SerialState | SerialState[], action: string) {
    const list = Array.isArray(allowed) ? allowed: [allowed];
    if (!list.includes(stateRef.current)) {
      throw new Error(`${action} is not allowed while mode is "${stateRef.current}"`);
    }
  }

  const waitForLilotaPrompt = useCallback(async () => {
    requireState("monitoring", "waitForLilotaPrompt");

    await terminalOutput.waitForLine(
      isLilotaPrompt,
      15_000,
      "Timed out waiting for Lilota prompt",
    );
  }, [terminalOutput]);

  const subscribeTerminal = useCallback((listener: (chunk: string) => void) => {
    return terminalOutput.subscribe(listener);
  }, [terminalOutput]);

  const getTerminalReplay = useCallback(() => {
    return terminalOutput.getReplayBuffer();
  }, [terminalOutput]);

  const clearTerminal = useCallback(() => {
    terminalOutput.clear();
  }, [terminalOutput]);

  const setState = useCallback((next: SerialState) => {
    const prev = stateRef.current;
    stateRef.current = next;
    _setState(next);

    if (prev !== next) {
      terminalOutput.appendSeparator(
        `${SERIAL_STATE_LABELS[prev]} → ${SERIAL_STATE_LABELS[next]}`
      );
    }
  }, [terminalOutput]);

  const createEspToolSession = useCallback((port: SerialPort) => {
    return new EspToolSession(port, {
      clean() {
        terminalOutput.appendSeparator("Esptool output", "output");
      },
      writeLine(text: string) {
        terminalOutput.appendStyled(`${text}\r\n`, "output");
      },
      write(text: string) {
        terminalOutput.appendStyled(text, "output");
      },
    });
  }, [terminalOutput]);

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

    let port: SerialPort | null = null;

    try {
      setState("connecting");
      setDeviceInfo(null);

      port = await requestSerialPort();
      portRef.current = port;

      setState("detecting");
      const espToolSession = createEspToolSession(port);
      espToolSessionRef.current = espToolSession;

      const detectedDevice = await espToolSession.detectDevice();
      await espToolSession.resetAndDisconnect();
      espToolSessionRef.current = null;

      await openSerialPort(port);
      setDeviceInfo(detectedDevice);
      setState("ready");
    } catch (error) {
      try {
        await espToolSessionRef.current?.disconnect();
      } catch (cleanupError) {
        console.warn("Failed to disconnect esptool after detection failure", cleanupError);
      }

      espToolSessionRef.current = null;

      if (port?.readable || port?.writable) {
        try {
          await closeSerialPort(port);
        } catch (cleanupError) {
          console.warn("Failed to close serial port after detection failure", cleanupError);
        }
      }

      portRef.current = null;
      setDeviceInfo(null);
      setState("disconnected");
      throw error;
    }
  }, [createEspToolSession, setState]);

  const startSerialMonitor = useCallback(async () => {
    requireState("ready", "startSerialMonitor");

    const port = portRef.current;

    if (!port) {
      throw new Error("No port connected");
    }

    const monitor = new SerialMonitor(port, (chunk) => terminalOutput.append(chunk));
    serialMonitorRef.current = monitor;
    setState("monitoring");

    void monitor.completed.then(
      () => undefined,
      (error) => {
        const message = error instanceof Error ? error.message : String(error);
        terminalOutput.appendSeparator(`Serial monitor failed: ${message}`, "error");
      },
    ).finally(() => {
      if (serialMonitorRef.current === monitor) {
        serialMonitorRef.current = null;
      }

      if (stateRef.current === "monitoring") {
        setState("ready");
      }
    });
  }, [setState, terminalOutput]);

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
      setDeviceInfo(null);
      setState("disconnected");
      return;
    }

    if (stateRef.current === "monitoring") {
      await stopSerialMonitor();
    }

    await closeSerialPort(port);
    portRef.current = null;
    setDeviceInfo(null);

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

      const espToolSession = createEspToolSession(port);
      espToolSessionRef.current = espToolSession;

      const detectedDevice = await espToolSession.detectDevice();
      setDeviceInfo(detectedDevice);

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
      terminalOutput.resetCurrentLine();
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
          setDeviceInfo(null);
          setState("disconnected");
        }
      }

      throw err;
    }
  }, [createEspToolSession, releaseSerialPort, resetToLilota, setState, startSerialMonitor, terminalOutput, waitForLilotaPrompt, writeSerial]);

  return (
    <SerialContext.Provider value={{
      deviceInfo,
      flashProgress,
      connectPort,
      disconnectPort,
      startSerialMonitor,
      stopSerialMonitor,
      flashFirmware: flashLilota,
      resetToLilota,
      subscribeTerminal,
      getTerminalReplay,
      clearTerminal,
      writeSerial,
      state
    }}>
      {children}
    </SerialContext.Provider>
  )
}
