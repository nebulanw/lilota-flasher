import { SerialProvider } from "./SerialProvider";
import { useSerial } from "./useSerial";
import { SerialTerminal } from "./SerialTerminal";
import { WifiForm } from "./WifiForm";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "./components/ui/label";
import { Switch } from "./components/ui/switch";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { RiUsbLine, RiLinkUnlinkM, RiResetRightLine, RiPlayLine, RiStopLine } from "@remixicon/react";


function FlashProgressBar() {
  const { flashProgress} = useSerial();
  return <Progress value={flashProgress} className="w-full max-w-sm">
    <ProgressLabel>Upload Progess</ProgressLabel>
    <ProgressValue />
  </Progress>
}

function ConnectButton() {
  const { connectPort, state } = useSerial();
  const disabled = state !== "disconnected";
  return (
    <Button disabled={disabled} onClick={connectPort}>
      <RiUsbLine data-icon="inline-start" /> Connect
    </Button>
  );
}

function DisconnectButton() {
  const { disconnectPort, state } = useSerial();
  const disabled = state !== "ready" && state !== "monitoring";
  return (
    <Button disabled={disabled} onClick={disconnectPort}>
      <RiLinkUnlinkM data-icon="inline-start" />Disconnect
    </Button>
  );
}

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

function ResetButton() {
  const { resetToLilota, state } = useSerial();
  const disabled = state !== "ready" && state !== "monitoring";

  return (
    <Button disabled={disabled} onClick={resetToLilota}>
      <RiResetRightLine data-icon="inline-left" />Reset
    </Button>
  );
}

function DeviceCard() {
  const {boardModel} = useSerial();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Device</CardTitle>

        <CardContent className="flex flex-col gap-3">
            Connect your ESP32 by plugging it in to your computer using a USB cable.
            <br/>Make sure to use a good quality cable!
            <br/>
          <div className="flex gap-1">
            <ConnectButton />
            <DisconnectButton />
          </div>
          <p>// TODO: Reworked board detection<br/>Board: {boardModel}</p>
        </CardContent>
      </CardHeader>
    </Card>
  )
}

function FlashCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Flash</CardTitle>
      </CardHeader>
      <p>DROPDOWN MENU FOR FIRMWARE SELECTOR VIA GUTHIB API</p>
      <CardContent className="flex gap-3">
        <div className="flex items-start gap-2">
          <Switch
              id="erase-flash"
          />
          <Label htmlFor="erase-flash">
              Erase existing flash
          </Label>
        </div>
        <WifiForm />
      </CardContent>
      <FlashProgressBar></FlashProgressBar>
                  
    </Card>
  )
}

function TerminalCard() {
  return (
    <Card className="flex min-h-0 flex-col">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>Terminal</CardTitle>

        <div className="please help flex gap-1">
          <ResetButton />
          <ToggleMonitorButton />
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
