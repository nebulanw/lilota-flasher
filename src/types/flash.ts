export type WifiSecurity = "wpa2-personal" | "open";

export type WifiConfiguration = {
  ssid: string;
  security: WifiSecurity;
  password?: string;
};

export type FlashRequest = {
  eraseFlash: boolean;
  wifi?: WifiConfiguration;
};
