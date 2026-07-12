export type WifiAuthentication = "open" | "wpa2-psk" | "wpa2-enterprise";

export type WifiConfiguration = {
  ssid: string;
  authentication: WifiAuthentication;
  password?: string;
  identity?: string;
  username?: string;
};

export type FlashRequest = {
  eraseFlash: boolean;
  wifi?: WifiConfiguration;
};
