import {
  RiDeleteBinLine,
  RiPlayLine,
  RiResetRightLine,
  RiStopLine,
} from "@remixicon/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSerial } from "@/useSerial";
import { SerialTerminal } from "./SerialTerminal";

export function TerminalCard() {
  const {
    clearTerminalBuffer,
    resetToLilota,
    startSerialMonitor,
    state,
    stopSerialMonitor,
  } = useSerial();

  const canUseSerial = state === "ready" || state === "monitoring";
  const isMonitoring = state === "monitoring";

  const handleMonitorToggle = async () => {
    try {
      if (isMonitoring) {
        await stopSerialMonitor();
      } else {
        await startSerialMonitor();
      }
    } catch (error) {
      console.error("Failed to toggle the serial monitor", error);
    }
  };

  const handleReset = async () => {
    try {
      await resetToLilota();
    } catch (error) {
      console.error("Failed to reset the ESP32", error);
    }
  };

  return (
    <Card className="flex min-h-0 flex-col">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle>Terminal</CardTitle>

        <div className="flex flex-wrap gap-1">
          <Button disabled={!canUseSerial} onClick={() => void handleReset()}>
            <RiResetRightLine data-icon="inline-start" />
            Reset
          </Button>

          <Button disabled={!canUseSerial} onClick={() => void handleMonitorToggle()}>
            {isMonitoring ? (
              <>
                <RiStopLine data-icon="inline-start" />
                Stop Monitoring
              </>
            ) : (
              <>
                <RiPlayLine data-icon="inline-start" />
                Start Monitoring
              </>
            )}
          </Button>

          <Button type="button" onClick={clearTerminalBuffer}>
            <RiDeleteBinLine data-icon="inline-start" />
            Clear
          </Button>
        </div>
      </CardHeader>

      <CardContent className="min-h-0 flex-1">
        <div className="h-full min-h-115 overflow-hidden border bg-[#101214]">
          <SerialTerminal />
        </div>
      </CardContent>
    </Card>
  );
}
