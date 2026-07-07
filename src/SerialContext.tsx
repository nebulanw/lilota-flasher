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

export function SerialProvider({ children }) {
  const portRef = useRef<SerialPort>(null);
  const transportRef = useRef<Transport>(null);
  const loaderRef = useRef<ESPLoader>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [boardModel, setBoardModel] = useState('Unknown');
  const [flashProgress, setFlashProgress] = useState('--%');

  // TODO: implement terminal handlers.
  const terminal: IEspLoaderTerminal = {
    clean() {},
    writeLine(data) {},
    write(data) {},
  };

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
    setBoardModel(boardModelTmp);
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
      flashFirmware
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
