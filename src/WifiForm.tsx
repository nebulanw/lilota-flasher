import { useState, type ComponentProps } from "react";
import { useSerial } from "./useSerial";

export function WifiForm() {
    const { configureWifi, flashFirmware, waitForLilotaPrompt, state } = useSerial();
    const [ssid, setSsid] = useState("");
    const [password, setPassword] = useState("");
    const [configureAfterFlash, setConfigureAfterFlash] = useState(false);
    const [isConfiguring, setIsConfiguring] = useState(false);
    const [isFlashing, setIsFlashing] = useState(false);

    const hasSsid = ssid.trim().length > 0;
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
            <label>
                SSID
                <input 
                    value={ssid}
                    onChange={(event) => setSsid(event.currentTarget.value)}
                    disabled={isConfiguring || isFlashing}
                />
            </label>
            <label>
                Password
                <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.currentTarget.value)}
                    disabled={isConfiguring || isFlashing}
                />
            </label>
            <label>
                <input
                    type="checkbox"
                    checked={configureAfterFlash}
                    onChange={(event) => setConfigureAfterFlash(event.currentTarget.checked)}
                    disabled={isConfiguring || isFlashing}
                />
                Configure Wi-Fi after flashing
            </label>
            <button disabled={!canConfigure} type="submit">
                {isConfiguring ? "Configuring..." : "Configure Wi-Fi"}
            </button>
            <button disabled={!canFlash} type="button" onClick={handleFlashClick}>
                {isFlashing
                    ? configureAfterFlash
                        ? "Flashing & configuring..."
                        : "Flashing..."
                    : configureAfterFlash
                        ? "Flash & Configure Wi-Fi"
                        : "Flash Lilota"}
            </button>
        </form>
    );
}
