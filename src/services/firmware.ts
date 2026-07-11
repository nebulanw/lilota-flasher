const DEFAULT_FIRMWARE_URL = "/lilota/lilota-webflash.bin";

export async function loadDefaultFirmware(): Promise<Uint8Array> {
  const response = await fetch(DEFAULT_FIRMWARE_URL);

  if (!response.ok) {
    throw new Error(`Failed to load firmware: ${response.status}`);
  }

  const firmware = new Uint8Array(await response.arrayBuffer());

  if (firmware.length === 0) {
    throw new Error("Firmware file is empty");
  }

  return firmware;
}
