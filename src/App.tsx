import { SerialProvider, useSerial } from "./SerialContext";
import { SerialTerminal } from "./SerialTerminal";

// async function sendSerialMessage(transport, message) {
//   const encoder = new TextEncoder();
//   const data = encoder.encode(message);
//   await transport.write(data);
// }

function FlashButton() {
  const { flashFirmware } = useSerial();
  return <button onClick={flashFirmware}>Flash</button>
}

function ConnectButton() {
  const { connectPort } = useSerial();
  return <button onClick={connectPort}>Connect</button>
}

function DisconnectButton() {
  const { disconnectPort } = useSerial();
  return <button onClick={disconnectPort}>Disconnect</button>
}

function StartMonitorButton() {
  const { startSerialMonitor } = useSerial();
  return <button onClick={startSerialMonitor}>Start Monitoring</button>
}

function StopMonitorButton() {
  const { stopSerialMonitor } = useSerial();
  return <button onClick={stopSerialMonitor}>Stop Monitoring</button>
}

function ResetButton() {
  const { resetToLilota } = useSerial();
  return <button onClick={resetToLilota}>Reset</button>
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
      <SerialTerminal />
    </SerialProvider>
  )
}
