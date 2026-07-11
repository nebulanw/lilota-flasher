import { createContext } from 'react';
import type { FlashRequest } from './features/flash/flashTypes';

export type SerialState =
  | "disconnected" // nothing
  | "connecting"   // user picked port + opening port
  | "ready" // raw serial port open at baud
  | "monitoring" // raw serial monitor using stream
  | "esptool"        // esptool's transport using stream
  | "flashing"       // flashing (flashing)
  | "flash-prepare" // should just be called "has port but not opened"
  | "handoff";      // esptool -> raw serial (???)

export type SerialContextValue = {
  boardModel: string;
  flashProgress: number;
  state: SerialState;
  connectPort: () => Promise<void>;
  disconnectPort: () => Promise<void>;
  startSerialMonitor: () => Promise<void>;
  stopSerialMonitor: () => Promise<void>;
  flashFirmware: (request: FlashRequest) => Promise<void>;
  resetToLilota: () => Promise<void>;
  subscribeTerminal: (listener: (chunk: string) => void) => () => void;
  getTerminalBuffer: () => string;
  clearTerminalBuffer: () => void;
  writeSerial: (data: string) => Promise<void>;
}

export const SerialContext = createContext<SerialContextValue | null>(null);
