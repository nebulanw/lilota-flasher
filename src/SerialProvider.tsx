import { useCallback, useEffect, useRef, useState } from 'react';
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
  subscribeToSerialDisconnect,
  writeSerialData,
} from './services/webSerial';
import type { DeviceInfo } from './types/device';
import { TerminalOutput } from './terminal/TerminalOutput';

export function SerialProvider({ children }: { children: React.ReactNode }) {
  const portRef = useRef<SerialPort>(null);
  const espToolSessionRef = useRef<EspToolSession | null>(null);
  const stateRef = useRef<SerialState>("disconnected");
  const serialMonitorRef = useRef<SerialMonitor | null>(null);
  const removePortDisconnectListenerRef = useRef<(() => void) | null>(null);

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
    stateRef.current = next;
    _setState(next);
  }, []);

  const removePortDisconnectListener = useCallback(() => {
    removePortDisconnectListenerRef.current?.();
    removePortDisconnectListenerRef.current = null;
  }, []);

  const trackPhysicalDisconnect = useCallback((port: SerialPort) => {
    removePortDisconnectListener();

    removePortDisconnectListenerRef.current = subscribeToSerialDisconnect(
      port,
      () => {
        if (portRef.current !== port) return;

        removePortDisconnectListener();
        portRef.current = null;
        serialMonitorRef.current = null;
        espToolSessionRef.current = null;
        setDeviceInfo(null);
        terminalOutput.cancelLineWaiters("USB device disconnected");
        terminalOutput.appendSeparator("USB device disconnected", "warning");
        setState("disconnected");
      },
    );
  }, [removePortDisconnectListener, setState, terminalOutput]);

  useEffect(() => {
    return removePortDisconnectListener;
  }, [removePortDisconnectListener]);

  const createEspToolSession = useCallback((port: SerialPort) => {
    return new EspToolSession(port, {
      clean() {},
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
      trackPhysicalDisconnect(port);

      setState("detecting");
      const espToolSession = createEspToolSession(port);
      espToolSessionRef.current = espToolSession;

      const detectedDevice = await espToolSession.detectDevice();
      await espToolSession.resetAndDisconnect();
      espToolSessionRef.current = null;

      await openSerialPort(port);

      if (portRef.current !== port) {
        throw new Error("Device disconnected during detection");
      }

      setDeviceInfo(detectedDevice);
      setState("ready");
    } catch (error) {
      try {
        await espToolSessionRef.current?.disconnect();
      } catch (cleanupError) {
        console.warn("Failed to disconnect esptool after detection failure", cleanupError);
      }

      espToolSessionRef.current = null;
      removePortDisconnectListener();

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
  }, [createEspToolSession, removePortDisconnectListener, setState, trackPhysicalDisconnect]);

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
        if (portRef.current !== port) return;

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
      removePortDisconnectListener();
      setDeviceInfo(null);
      setState("disconnected");
      return;
    }

    if (stateRef.current === "monitoring") {
      await stopSerialMonitor();
    }

    if (portRef.current !== port) return;

    await closeSerialPort(port);
    removePortDisconnectListener();
    portRef.current = null;
    setDeviceInfo(null);

    setState("disconnected");
  }, [removePortDisconnectListener, setState, stopSerialMonitor]);

  const releaseSerialPort = useCallback(async() => {
    requireState(["ready", "monitoring"], "releaseSerialPort");

    const port = portRef.current;
    if (!port) {
      throw new Error("No port available");
    }

    const previousState = stateRef.current;
    setState("preparing-flash");

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

      setState("bootloader");

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

      setState("restoring-serial");

      await espToolSession.resetAndDisconnect();
      espToolSessionRef.current = null;

      if (portRef.current !== port) {
        throw new Error("USB device disconnected during flashing");
      }

      await openSerialPort(port);

      if (portRef.current !== port) {
        throw new Error("USB device disconnected while restoring serial");
      }

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
      if (!rawSerialRestored && portRef.current === port) {
        try {
          await espToolSessionRef.current?.disconnect();
        } catch (error) {
          console.warn("Failed to disconnect esptool during cleanup", error);
        }

        espToolSessionRef.current = null;

        try {
          await openSerialPort(port);

          if (portRef.current === port) {
            setState("ready");
          } else if (port.readable || port.writable) {
            await closeSerialPort(port);
          }
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
