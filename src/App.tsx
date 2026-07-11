import { SerialProvider } from "./SerialProvider";
import { useSerial } from "./useSerial";
import { SerialTerminal } from "./SerialTerminal";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RiResetRightLine, RiPlayLine, RiStopLine, RiDeleteBinLine } from "@remixicon/react";
import { DeviceCard } from "./features/device/DeviceCard";
import { FlashCard } from "./features/flash/FlashCard";

function ToggleMonitorButton() {
  const { startSerialMonitor, stopSerialMonitor, state } = useSerial();
  const disabled = state !== "ready" && state !== "monitoring";

  const handleToggle = () => {
    if (state === "monitoring") {
      stopSerialMonitor();
    } else {
      startSerialMonitor();
    }
  }

  return (
    <Button disabled={disabled} onClick={handleToggle}>
      {state === "monitoring" ? (
        <>
          <RiStopLine data-icon="inline-start" />
          Stop Monitoring
        </>
        )
         : (
          <>
            <RiPlayLine data-icon="inline-start" />
            Start Monitoring
          </>
         )}
    </Button>
  );
}

function ClearTerminalButton() {
  return (
    <Button>
      <RiDeleteBinLine data-icon="inline-start" />
      Clear
    </Button>
  )
}

function ResetButton() {
  const { resetToLilota, state } = useSerial();
  const disabled = state !== "ready" && state !== "monitoring";

  return (
    <Button disabled={disabled} onClick={resetToLilota}>
      <RiResetRightLine data-icon="inline-left" />Reset
    </Button>
  );
}

function TerminalCard() {
  return (
    <Card className="flex min-h-0 flex-col">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>Terminal</CardTitle>

        <div className="please help flex gap-1">
          <ResetButton />
          <ToggleMonitorButton />
          <ClearTerminalButton />
        </div>
      </CardHeader>
      <CardContent className="min-h-0 flex-1">
        <div className="h-full min-h-115 overflow-hidden border bg-[#101214]">
          <SerialTerminal />
        </div>
      </CardContent>
    </Card>
  )
}

export default function App() {
  return (
    <SerialProvider>
      <main className="min-h-screen bg-background p-6 text-foreground">
        <div className="mx-auto flex flex-col gap-4">
          <header className="flex items-center justify-between">
            <div>
              <h1 className="font-heading text-2xl font-semibold">
                Lilota
              </h1>
              <p className="text-sm">
                Flasher for Lilota!
              </p>
            </div>
          </header>
          <div className="grid gap-4 ">
            {/* <WorkflowPanel /> */}
            <div className="flex flex-col gap-4">
              <DeviceCard />
              <FlashCard />
            </div>
          </div>
          {/* <BoardLabel></BoardLabel> */}
          <TerminalCard />
        </div>
      </main>
    </SerialProvider>
  )
}
