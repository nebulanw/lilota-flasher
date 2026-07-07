import { createContext, useCallback, useContext, useRef, useState } from 'react';
import {
  ESPLoader,
  Transport,
  FlashOptions,
  LoaderOptions,
  IEspLoaderTerminal,
  FlashModeValues,
  FlashFreqValues,
  FlashSizeValues
} from "esptool-js";

const SerialContext = createContext(null);

const decoder = new TextDecoder('utf-8');
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type SerialState =
  | "disconnected" // nothing
  | "connecting"   // user picked port + opening port
  | "serial-ready" // raw serial port open, nothing on it
  | "serial-reading" // raw serial monitor using stream
  | "esptool"        // esptool's transport using stream
  | "flashing"       // flashing (flashing)
  | "handoff";      // esptool -> raw serial (???)

export function SerialProvider({ children }) {
  const portRef = useRef<SerialPort>(null);
  const transportRef = useRef<Transport | null>(null);
  const loaderRef = useRef<ESPLoader | null>(null);
  const stateRef = useRef<SerialState>("disconnected" as SerialState);

  const [isConnected, setIsConnected] = useState(false);
  const [boardModel, setBoardModel] = useState('Unknown');
  const [flashProgress, setFlashProgress] = useState('--%');

  // TODO: implement terminal handlers.
  const terminal: IEspLoaderTerminal = {
    clean() {},
    writeLine(data) {},
    write(data) {},
  };

  const resetToLilota = useCallback(async(port) => {
    // go to POWERON_RESET + SPI_FAST_FLASH_BOOT mode
    await port.setSignals({ dataTerminalReady: false, requestToSend: false });
    await sleep(100);
    await port.setSignals({ dataTerminalReady: false, requestToSend: true });
    await sleep(100);
    await port.setSignals({ dataTerminalReady: false, requestToSend: false });
    await sleep(100);
  }, []);

  const connect = useCallback(async() => {
    const port = await navigator.serial.requestPort();
    portRef.current = port;

    const transport = new Transport(port, true);
    transportRef.current = transport;

    const loaderOptions: LoaderOptions = {
      transport: transport,
      baudrate: 115200,
      terminal: terminal,
      debugLogging: false,
    };

    const loader = new ESPLoader(loaderOptions);
    loaderRef.current = loader;

    // You MUST do this to start the session.
    const boardModelTmp = await loader.main();
    stateRef.current = "esptool" as SerialState;
    setBoardModel(boardModelTmp);

    await sleep(500);

    await loader.after("hard_reset");

    await sleep(500);
    console.log(portRef.current?.readable?.locked);
    await transport.disconnect();
    console.log("got here");
    await port.open({ baudRate: 115200 });
    const reader = port.readable.getReader();
    await sleep(500);
    await resetToLilota(port);
    // await reader.
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        reader.releaseLock();
        break;
      }
      if (value) {
        console.log(decoder.decode(value));
      }
    }
  }, []);

  const disconnect = useCallback(async() => {
    const transport = transportRef.current;
    transport?.disconnect();
    transportRef.current = null; // I guess??? 
  }, []);

  const flashFirmware = useCallback(async() => {
    const loader = loaderRef.current;

    const firmwareResponse = await fetch("/lilota/merged-firmware.bin");
    const firmware = new Uint8Array(await firmwareResponse.arrayBuffer());

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

    try {
      await loader?.writeFlash(flashOptions);
      await loader?.after("hard_reset");
    } catch (error) {
      await loader?.after("hard_reset");
      console.log("Flashing error :(", error);
    }
  }, []);

  return (
    <SerialContext.Provider value={{
      isConnected,
      boardModel,
      flashProgress,
      connect,
      flashFirmware,
      disconnect,
      stateRef
    }}>
      {children}
    </SerialContext.Provider>
  )
}

export const useSerial = () => {
  const context = useContext(SerialContext);
  if (!context) throw new Error('useSerial must be used within a SerialProvider');
  return context;
}
