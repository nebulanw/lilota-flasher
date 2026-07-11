import { useState } from "react";
import { RiLinkUnlinkM, RiUsbLine } from "@remixicon/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSerial } from "@/useSerial";
import type { SerialState } from "@/SerialContext";

// for device status badge
const getConnectionStatus = (state: SerialState) => {
  switch (state) {
    case "disconnected":
      return { label: "Disconnected", variant: "secondary" as const };
    
    case "connecting":
      return { label: "Connecting...", variant: "outline" as const };

    case "detecting":
      return { label: "Detecting device...", variant: "outline" as const };
    
    case "ready":
      return { label: "Connected", variant: "default" as const };
    
    case "monitoring":
      return { label: "Connected - Monitoring", variant: "default" as const };
    
    case "flash-prepare":
    case "esptool":
    case "flashing":
    case "handoff":
      return { label: "Connected - Busy", variant: "default" as const };
  }
}

export function DeviceCard() {
  const { state, deviceInfo, connectPort, disconnectPort } = useSerial();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isDisconnected = state === "disconnected";
  const isConnecting = state === "connecting" || state === "detecting";
  const canDisconnect = state === "ready" || state === "monitoring";
  const isConnected = !isDisconnected && !isConnecting;

  const connectionStatus = getConnectionStatus(state);

  const handleConnect = async () => {
    setErrorMessage(null);

    try {
      await connectPort();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const handleDisconnect = async () => {
    setErrorMessage(null);

    try {
      await disconnectPort();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Device</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <p>
          Connect your ESP32 to your device.
          <br />
          Make sure to use a good-quality USB data transfer cable!
        </p>

        <div className="flex gap-2">
          <Button
            disabled={!isDisconnected}
            onClick={() => void handleConnect()}
          >
            <RiUsbLine data-icon="inline-start" />
            {isConnecting ? "Connecting..." : "Connect"}
          </Button>

          <Button
            disabled={!canDisconnect}
            onClick={() => void handleDisconnect()}
          >
            <RiLinkUnlinkM data-icon="inline-start" />
            Disconnect
          </Button>
        </div>

        {/* NOTE: Does it make sense to change the color? */}
        <Badge variant={connectionStatus.variant}>
          State: {connectionStatus.label}
        </Badge>

        {errorMessage && (
          <p role="alert" className="text-xs text-destructive">
            {errorMessage}
          </p>
        )}

        {isConnected && deviceInfo && (
          <div className="grid gap-2">
            <p className="text-sm font-medium">Device information</p>
            <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-xs">
              <dt className="text-muted-foreground">Family</dt>
              <dd>{deviceInfo.family}</dd>

              <dt className="text-muted-foreground">Model</dt>
              <dd>{deviceInfo.model}</dd>

              {deviceInfo.revision !== undefined && (
                <>
                  <dt className="text-muted-foreground">Revision</dt>
                  <dd>{deviceInfo.revision}</dd>
                </>
              )}

              <dt className="text-muted-foreground">Crystal</dt>
              <dd>{deviceInfo.crystalFrequencyMhz} MHz</dd>

              <dt className="text-muted-foreground">MAC address</dt>
              <dd className="font-mono">{deviceInfo.macAddress}</dd>

              {deviceInfo.features.length > 0 && (
                <>
                  <dt className="text-muted-foreground">Features</dt>
                  <dd>{deviceInfo.features.join(", ")}</dd>
                </>
              )}
            </dl>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
