import { useState } from 'react';
import {
  ESPLoader,
  Transport,
  LoaderOptions,
  FlashOptions,
  IEspLoaderTerminal
} from "esptool-js";


async function requestSerial() {
  const port = await navigator.serial.requestPort();
  // transport is a webserial wrapper.
  const transport = new Transport(port, true);
  const terminal: IEspLoaderTerminal = {
    clean() {},
    writeLine(data) {},
    write(data) {
      if (data) return;
    },
  };
  const loaderOptions: LoaderOptions = {
    transport: transport,
    baudrate: 115200,
    terminal: terminal,
    debugLogging: false,
  };

  const loader = new ESPLoader(loaderOptions);

  try {
    const chipName = await loader.main();
    console.log(`Connected to ${chipName}`);
  } catch (error) {
    console.error("Failed to connect: ", error)
  }
}

function App() {

  return (
    <>
      <button onClick={requestSerial}>requestSerial</button>
    </>
  )
}

export default App
