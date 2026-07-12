import { SerialProvider } from "./SerialProvider";
import { DeviceCard } from "./features/device/DeviceCard";
import { FlashCard } from "./features/flash/FlashCard";
import { TerminalCard } from "./features/terminal/TerminalCard";

export default function App() {
  return (
    <SerialProvider>
      <main className="min-h-screen bg-background p-6 text-foreground">
        <div className="mx-auto flex flex-col gap-4">
          <header>
            <div>
              <img
                src={`${import.meta.env.BASE_URL}logo.png`}
                alt="Lilota"
                className="h-10 w-auto"
              />
              <p className="text-sm">
                Lilota Flasher
              </p>
              <a
                href="../index.html"
                className="mt-1 inline-block text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80"
              >
                &larr; Back to main site
              </a>
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
