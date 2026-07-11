import { RiLinkUnlinkM, RiUsbLine } from "@remixicon/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSerial } from "@/useSerial";
import { SerialState } from "@/SerialContext";

// for device status badge
const getConnectionStatus = (state: SerialState) => {
  switch (state) {
    case "disconnected":
      return { label: "Disconnected", variant: "secondary" as const };
    
    case "connecting":
      return { label: "Connecting...", variant: "outline" as const };
    
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
  const { state, boardModel, connectPort, disconnectPort } = useSerial();

  const isDisconnected = state === "disconnected";
  const isConnecting = state === "connecting";
  const canDisconnect = state === "ready" || state === "monitoring";
  const isConnected = !isDisconnected && !isConnecting;

  const connectionStatus = getConnectionStatus(state);

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
            onClick={() => void connectPort()}
          >
            <RiUsbLine data-icon="inline-start" />
            {isConnecting ? "Connecting..." : "Connect"}
          </Button>

          <Button
            disabled={!canDisconnect}
            onClick={() => void disconnectPort()}
          >
            <RiLinkUnlinkM data-icon="inline-start" />
            Disconnect
          </Button>
        </div>

        {/* NOTE: Does it make sense to change the color? */}
        <Badge variant={connectionStatus.variant}>
          State: {connectionStatus.label}
        </Badge>

        {isConnected && boardModel !== "Unknown" && (
          <p>Board: {boardModel}</p>
        )}
      </CardContent>
    </Card>
  );
}
