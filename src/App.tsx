import { SerialProvider, useSerial } from "./SerialContext";

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
  const { connect } = useSerial();
  return <button onClick={connect}>Connect</button>
}

function DisconnectButton() {
  const { disconnect } = useSerial();
  return <button onClick={disconnect}>Disconnect</button>
}

function BoardLabel() {
  const { boardModel, flashProgress } = useSerial();
  return (
    <>
      <p>Board: {boardModel}</p>
      <p>Flash progress: {flashProgress}</p>
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
      <BoardLabel></BoardLabel>
    </SerialProvider>
  )
}
