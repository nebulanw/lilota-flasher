import {
  ESPLoader,
  Transport,
  type FlashOptions,
  type FlashFreqValues,
  type FlashModeValues,
  type FlashSizeValues,
} from "esptool-js";

const ESPTOOL_BAUD_RATE = 115_200;
const RESET_SETTLE_DELAY_MS = 150;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type EspToolOutput = {
  clean: () => void;
  writeLine: (text: string) => void;
  write: (text: string) => void;
};

export type WriteFirmwareOptions = {
  eraseAll: boolean;
  onProgress: (percent: number) => void;
};

export class EspToolSession {
  private readonly transport: Transport;
  private readonly loader: ESPLoader;
  private disconnected = false;

  constructor(port: SerialPort, output: EspToolOutput) {
    this.transport = new Transport(port, true);
    this.loader = new ESPLoader({
      transport: this.transport,
      baudrate: ESPTOOL_BAUD_RATE,
      terminal: output,
    });
  }

  async connect() {
    return this.loader.main();
  }

  async writeFirmware(
    firmware: Uint8Array,
    { eraseAll, onProgress }: WriteFirmwareOptions,
  ) {
    const flashOptions: FlashOptions = {
      fileArray: [{ data: firmware, address: 0x00 }],
      flashMode: "keep" as FlashModeValues,
      flashFreq: "keep" as FlashFreqValues,
      flashSize: "4MB" as FlashSizeValues,
      eraseAll,
      compress: true,
      reportProgress: (_, written, total) => {
        const percent = total > 0 ? Math.round((written / total) * 100) : 0;
        onProgress(percent);
      },
    };

    await this.loader.writeFlash(flashOptions);
  }

  async resetAndDisconnect() {
    await this.loader.after("hard_reset");
    await sleep(RESET_SETTLE_DELAY_MS);
    await this.disconnect();
  }

  async disconnect() {
    if (this.disconnected) return;

    await this.transport.disconnect();
    this.disconnected = true;
  }
}
