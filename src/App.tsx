import { useRef, useState } from 'react';
import {
  ESPLoader,
  Transport,
  LoaderOptions,
  FlashOptions,
  IEspLoaderTerminal,
  FlashModeValues,
  FlashFreqValues,
  FlashSizeValues
} from "esptool-js";

async function sendSerialMessage(transport, message) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  await transport.write(data);
}

function ConnectionButton({ portRef }) {
  const handleConnect = async() => {
    const port = await navigator.serial.requestPort();
    portRef.current = port;
  }
  
  return <button onClick={handleConnect}>Connect</button>
}

function DetectButton({ portRef, setChipNameText }) {
  const handleDetectClick = async () => {
    const port = portRef.current;
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
      setChipNameText(chipName);
      console.log(`Connected to ${chipName}`);
    } catch (error) {
      setChipNameText("error! (see console)");
      console.error("Error:", error);
    }

    transport.disconnect();
    console.log("disconnected!");
  }
  return <button onClick={handleDetectClick}>Detect chip type</button>
}

function FlashButton({ portRef, setProgressText }) {
  const handleFlashClick = async () => {
    // TODO: don't do this
    const port = portRef.current;
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


    // end todo


    const binaryResponse = await fetch("/lilota/merged-firmware.bin");
    const firmware = new Uint8Array(await binaryResponse.arrayBuffer());
    const flashOptions: FlashOptions = {
      fileArray: [
        { data: firmware, address: 0 }
      ],
      flashMode: "keep" as FlashModeValues,
      flashFreq: "keep" as FlashFreqValues,
      flashSize: "4MB" as FlashSizeValues,
      eraseAll: true, // TODO: make this a checkbox because that's cooler
      compress: true,
      reportProgress: (fileIndex, written, total) => {
        const percent = (written / total) * 100;
        setProgressText(`${percent}%`);
      }
    }
    await loader.main();
    try {
      await loader.writeFlash(flashOptions);
      console.log("yippee!");
      await loader.after("hard_reset");
      transport.disconnect();
    } catch (error) {
      await loader.after("hard_reset");
      transport.disconnect();
    }
    
    // transport.disconnect();
  }
  return <button onClick={handleFlashClick}>Flash</button>
}

function ConfigureWifiButton({ portRef }) {
  const handleConfigureClick = async() => {
    const ssid = "FredIotNetwork";
    const pass = "12345678";
    const ssidCommand = `config set wifi_ssid ${ssid}`;
    const passCommand = `config set wifi_pass ${pass}`;

    // TODO: don't do this
    const port = portRef.current;
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

    // You MUST do this to start the session.
    await loader.main();

    await sendSerialMessage(transport, ssidCommand);
    await sendSerialMessage(transport, passCommand);
    await sendSerialMessage(transport, "reboot"); // TODO: use the proper `wifi` command.

    // You MUST do this after you're done with the session.
    transport.disconnect();
  }
  return <button onClick={handleConfigureClick}>Set Wi-Fi</button>
}



export default function App() {
  const portRef = useRef(null);
  const [chipNameText, setChipNameText] = useState("<unknown>");
  const [progressText, setProgressText] = useState("<unknown>");
  return (
    <>
      <ConnectionButton portRef={portRef}></ConnectionButton>
      <DetectButton portRef={portRef} setChipNameText={setChipNameText}></DetectButton>
      <p>Your board is {chipNameText}</p>
      <p>my progress on install is {progressText}</p>
      <FlashButton portRef={portRef} setProgressText={setProgressText}></FlashButton>
      <ConfigureWifiButton portRef={portRef}></ConfigureWifiButton>
    </>
  )
}
