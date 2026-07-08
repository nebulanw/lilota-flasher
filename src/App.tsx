import { SerialProvider } from "./SerialProvider";
import { useSerial } from "./useSerial";
import { SerialTerminal } from "./SerialTerminal";
import { WifiForm } from "./WifiForm";

function FlashButton() {
  const { flashFirmware, state } = useSerial();
  const disabled = state !== "ready" && state !== "monitoring";
  return <button disabled={disabled} onClick={flashFirmware}>Flash</button>
}

function ConnectButton() {
  const { connectPort, state } = useSerial();
  const disabled = state !== "disconnected";
  return <button disabled={disabled} onClick={connectPort}>Connect</button>
}

function DisconnectButton() {
  const { disconnectPort, state } = useSerial();
  const disabled = state !== "ready" && state !== "monitoring";
  return <button disabled={disabled} onClick={disconnectPort}>Disconnect</button>
}

function StartMonitorButton() {
  const { startSerialMonitor, state } = useSerial();
  const disabled = state !== "ready";

  return (
    <button disabled={disabled} onClick={startSerialMonitor}>
      Start Monitoring
    </button>
  );
}

function StopMonitorButton() {
  const { stopSerialMonitor, state } = useSerial();
  const disabled = state !== "monitoring";

  return (
    <button disabled={disabled} onClick={stopSerialMonitor}>
      Stop Monitoring
    </button>
  );
}

function ResetButton() {
  const { resetToLilota, state } = useSerial();
  const disabled = state !== "ready" && state !== "monitoring";

  return (
    <button disabled={disabled} onClick={resetToLilota}>
      Reset
    </button>
  );
}

function BoardLabel() {
  const { boardModel, flashProgress, state } = useSerial();
  return (
    <>
      <p>Board: {boardModel}</p>
      <p>Flash progress: {flashProgress}</p>
      <p>State: {state}</p>
    </>
  )
}

export default function App() {
  return (
    <SerialProvider>
      <h2>Lilota tool :D</h2>
      <ConnectButton></ConnectButton>
      <DisconnectButton></DisconnectButton>
      <FlashButton></FlashButton>
      <StartMonitorButton></StartMonitorButton>
      <StopMonitorButton></StopMonitorButton>
      <ResetButton></ResetButton>
      <BoardLabel></BoardLabel>
      <WifiForm></WifiForm>
      <SerialTerminal />
    </SerialProvider>
  )
}
