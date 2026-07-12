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
      return { label: "Monitoring", variant: "default" as const };
    
    case "preparing-flash":
    case "bootloader":
    case "flashing":
    case "restoring-serial":
      return { label: "Busy", variant: "default" as const };
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

  const handleConnectionToggle = async () => {
    setErrorMessage(null);

    try {
      if (isDisconnected) {
        await connectPort();
      } else {
        await disconnectPort();
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const canToggleConnection = isDisconnected || canDisconnect;
  const connectionButtonLabel = isDisconnected ? "Connect" : "Disconnect";

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

        <div className="flex items-center gap-3">
          <Button
            className="w-fit"
            disabled={!canToggleConnection}
            onClick={() => void handleConnectionToggle()}
          >
            {canDisconnect ? (
              <RiLinkUnlinkM data-icon="inline-start" />
            ) : (
              <RiUsbLine data-icon="inline-start" />
            )}
            {connectionButtonLabel}
          </Button>

          <Badge variant={connectionStatus.variant}>
            {connectionStatus.label}
          </Badge>
        </div>

        {errorMessage && (
          <p role="alert" className="text-sm text-destructive">
            {errorMessage}
          </p>
        )}

        {isConnected && deviceInfo && (
          <div className="grid gap-2">
            <p className="text-base font-medium">Device information</p>
            <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
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

            </dl>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
