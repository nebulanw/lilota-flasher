import { SerialProvider } from "./SerialProvider";
import { useSerial } from "./useSerial";
import { SerialTerminal } from "./SerialTerminal";
import { WifiForm } from "./WifiForm";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function FlashButton() {
  const { flashFirmware, state } = useSerial();
  const disabled = state !== "ready" && state !== "monitoring";
  return <Button disabled={disabled} onClick={flashFirmware}>Flash</Button>
}

function ConnectButton() {
  const { connectPort, state } = useSerial();
  const disabled = state !== "disconnected";
  return <Button disabled={disabled} onClick={connectPort}>Connect</Button>
}

function DisconnectButton() {
  const { disconnectPort, state } = useSerial();
  const disabled = state !== "ready" && state !== "monitoring";
  return <Button disabled={disabled} onClick={disconnectPort}>Disconnect</Button>
}

function StartMonitorButton() {
  const { startSerialMonitor, state } = useSerial();
  const disabled = state !== "ready";

  return (
    <Button disabled={disabled} onClick={startSerialMonitor}>
      Start Monitoring
    </Button>
  );
}

function StopMonitorButton() {
  const { stopSerialMonitor, state } = useSerial();
  const disabled = state !== "monitoring";

  return (
    <Button disabled={disabled} onClick={stopSerialMonitor}>
      Stop Monitoring
    </Button>
  );
}

function ResetButton() {
  const { resetToLilota, state } = useSerial();
  const disabled = state !== "ready" && state !== "monitoring";

  return (
    <Button disabled={disabled} onClick={resetToLilota}>
      Reset
    </Button>
  );
}

function BoardLabel() {
  const { boardModel, flashProgress, state } = useSerial();
  return (
    <div className="text-right text-sm">
      <div className="font-medium">State: {state}</div>
      <div className="text-muted-foreground">
        Board: {boardModel}
      </div>
      <p>Flash progress: {flashProgress}</p>
    </div>
  )
}

function DeviceCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Device</CardTitle>

        <CardContent className="flex flex-col gap-3">
          <div className="flex">
            <ConnectButton />
            <DisconnectButton />
            <ResetButton />
          </div>
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

      <CardContent className="flex flex-col gap-3">
        <FlashButton />
      </CardContent>
    </Card>
  )
}

function WifiCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Wi-Fi</CardTitle>
      </CardHeader>

      <CardContent>
        <WifiForm />
      </CardContent>
    </Card>
  )
}

function TerminalCard() {
  return (
    <Card className="min-h-130">
      <CardHeader>
        <CardTitle>Terminal</CardTitle>
      </CardHeader>
      <CardContent className="min-h-0 flex-1">
        <div className="h-115 overflow-hidden border bg-black">
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

          <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
            <div className="flex flex-col gap-4">
              <DeviceCard />
              <FlashCard />
              <WifiCard />
            </div>
          </div>
          <StartMonitorButton></StartMonitorButton>
          <StopMonitorButton></StopMonitorButton>
          <BoardLabel></BoardLabel>
          <TerminalCard />
        </div>
      </main>
    </SerialProvider>
  )
}
