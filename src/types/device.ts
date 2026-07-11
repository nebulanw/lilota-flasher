export type DeviceInfo = {
  family: string;
  model: string;
  revision?: number;
  features: string[];
  crystalFrequencyMhz: number;
  macAddress: string;
};
