import { createContext } from 'react';
import type { FlashRequest } from './types/flash';
import type { DeviceInfo } from './types/device';

export type SerialState =
  | "disconnected" // no selected port
  | "connecting" // waiting for the user to select a port
  | "detecting" // esptool is identifying the selected device
  | "ready" // raw serial is open and idle
  | "monitoring" // raw serial reader is active
  | "preparing-flash" // raw serial is being released
  | "bootloader" // esptool owns the port
  | "flashing" // firmware is being written
  | "restoring-serial"; // esptool is handing the port back

export type SerialContextValue = {
  deviceInfo: DeviceInfo | null;
  flashProgress: number;
  state: SerialState;
  connectPort: () => Promise<void>;
  disconnectPort: () => Promise<void>;
  startSerialMonitor: () => Promise<void>;
  stopSerialMonitor: () => Promise<void>;
  flashFirmware: (request: FlashRequest) => Promise<void>;
  resetToLilota: () => Promise<void>;
  subscribeTerminal: (listener: (chunk: string) => void) => () => void;
  getTerminalReplay: () => string;
  clearTerminal: () => void;
  writeSerial: (data: string) => Promise<void>;
}

export const SerialContext = createContext<SerialContextValue | null>(null);
