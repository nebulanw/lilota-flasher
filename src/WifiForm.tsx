import { useState, type ComponentProps } from "react";
import { useSerial } from "./useSerial";
import { Button } from "./components/ui/button";
import { Checkbox } from "./components/ui/checkbox";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { RiDownload2Line } from "@remixicon/react";

export function WifiForm() {
    const { configureWifi, flashFirmware, waitForLilotaPrompt, state } = useSerial();
    const [ssid, setSsid] = useState("");
    const [password, setPassword] = useState("");
    const [configureAfterFlash, setConfigureAfterFlash] = useState(false);
    const [isConfiguring, setIsConfiguring] = useState(false);
    const [isFlashing, setIsFlashing] = useState(false);

    const hasSsid = ssid.trim().length >= 0;
    const canConfigure = state === "monitoring" && hasSsid && !isConfiguring && !isFlashing;
    const canFlash = 
        (state === "ready" || state === "monitoring") &&
        !isConfiguring &&
        !isFlashing &&
        (!configureAfterFlash || hasSsid);

    const handleSubmit: ComponentProps<"form">["onSubmit"] = async (event) => {
        event.preventDefault();

        try {
            setIsConfiguring(true);
            await configureWifi(ssid, password);
        } catch (error) {
            console.error(error);
            alert(error instanceof Error ? error.message : String(error));
        } finally {
            setIsConfiguring(false);
        }
    };

    async function handleFlashClick() {
        try {
            setIsFlashing(true);

            await flashFirmware();

            if (configureAfterFlash) {
                await waitForLilotaPrompt();
                await configureWifi(ssid, password);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsFlashing(false);
        }
    }

    return (
        <form onSubmit={handleSubmit}>
                        <div className="flex items-center gap-2">
                <Checkbox
                    id="configure-after-flash"
                    checked={configureAfterFlash}
                    onCheckedChange={(checked) => setConfigureAfterFlash(checked === true)}
                    disabled={isConfiguring || isFlashing}
                />
                <Label htmlFor="configure-after-flash">
                    Configure a Wi-Fi network
                    <br/>(i) Lilota will create an Access Point otherwise.
                </Label>
            </div>
            <div className="space-y-2">
                <Label htmlFor="wifi-ssid">SSID</Label>
                <Input 
                    id="wifi-ssid"
                    value={ssid}
                    onChange={(event) => setSsid(event.currentTarget.value)}
                    disabled={isConfiguring || isFlashing}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="wifi-password">Password</Label>
                <Input
                    id="wifi-password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.currentTarget.value)}
                    disabled={isConfiguring || isFlashing}
                />
            </div>
            <div className="flex gap-2">
                <Button disabled={!canFlash} type="button" onClick={handleFlashClick}>
                    <RiDownload2Line data-icon="inline-start" />{isFlashing ? "Flashing..." : "Flash"}
                </Button>
            </div>
        </form>
    );
}
