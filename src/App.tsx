import { SerialProvider } from "./SerialProvider";
import { DeviceCard } from "./features/device/DeviceCard";
import { FlashCard } from "./features/flash/FlashCard";
import { TerminalCard } from "./features/terminal/TerminalCard";

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
          <div className="grid items-start gap-4 lg:grid-cols-2">
            <DeviceCard />
            <FlashCard />
          </div>
          <TerminalCard />
        </div>
      </main>
    </SerialProvider>
  )
}
