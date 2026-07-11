const SERIAL_BAUD_RATE = 115_200;
const RESET_SIGNAL_DELAY_MS = 100;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function requestAndOpenSerialPort() {
  const port = await navigator.serial.requestPort();
  await openSerialPort(port);
  return port;
}

export async function openSerialPort(port: SerialPort) {
  await port.open({ baudRate: SERIAL_BAUD_RATE });
}

export async function closeSerialPort(port: SerialPort) {
  await port.close();
}

export async function writeSerialData(port: SerialPort, data: string) {
  if (!port.writable) {
    throw new Error("Port is not writable");
  }

  const writer = port.writable.getWriter();

  try {
    await writer.write(new TextEncoder().encode(data));
  } finally {
    writer.releaseLock();
  }
}

export async function resetEsp32(port: SerialPort) {
  await port.setSignals({ dataTerminalReady: false, requestToSend: false });
  await sleep(RESET_SIGNAL_DELAY_MS);
  await port.setSignals({ dataTerminalReady: false, requestToSend: true });
  await sleep(RESET_SIGNAL_DELAY_MS);
  await port.setSignals({ dataTerminalReady: false, requestToSend: false });
  await sleep(RESET_SIGNAL_DELAY_MS);
}

export class SerialMonitor {
  private readonly reader: ReadableStreamDefaultReader<Uint8Array>;
  readonly completed: Promise<void>;

  constructor(port: SerialPort, onData: (chunk: string) => void) {
    if (!port.readable) {
      throw new Error("Port is not readable");
    }

    this.reader = port.readable.getReader();
    this.completed = this.read(onData);
  }

  private async read(onData: (chunk: string) => void) {
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { value, done } = await this.reader.read();
        if (done) break;
        if (!value) continue;

        const text = decoder.decode(value, { stream: true });
        if (text) onData(text);
      }

      const remaining = decoder.decode();
      if (remaining) onData(remaining);
    } finally {
      this.reader.releaseLock();
    }
  }

  async stop() {
    await this.reader.cancel();
    await this.completed;
  }
}
