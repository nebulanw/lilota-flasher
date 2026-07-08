import { useState, type ComponentProps } from "react";
import { useSerial } from "./useSerial";

export function WifiForm() {
    const { configureWifi, state } = useSerial();
    const [ssid, setSsid] = useState("");
    const [password, setPassword] = useState("");
    const [isConfiguring, setIsConfiguring] = useState(false);

    const disabled = state !== "monitoring" || isConfiguring;

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

    return (
        <form onSubmit={handleSubmit}>
            <label>
                SSID
                <input 
                    value={ssid}
                    onChange={(event) => setSsid(event.currentTarget.value)}
                    disabled={isConfiguring}
                />
            </label>
            <label>
                Password
                <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.currentTarget.value)}
                    disabled={isConfiguring}
                />
            </label>
            <button disabled={disabled || !ssid.trim()} type="submit">
                {isConfiguring ? "Configuring..." : "Configure Wi-Fi"}
            </button>
        </form>
    );
}
