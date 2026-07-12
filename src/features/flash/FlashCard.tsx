import { useState, type ComponentProps } from "react";
import { RiDownload2Line, RiInformationLine } from "@remixicon/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSerial } from "@/useSerial";
import type { FlashRequest, WifiAuthentication } from "@/types/flash";
import { WifiFields } from "./WifiFields";

export function FlashCard() {
  const { flashFirmware, flashProgress, state } = useSerial();
  const [eraseFlash, setEraseFlash] = useState(false);
  const [configureWifi, setConfigureWifi] = useState(false);
  const [wifiAuthentication, setWifiAuthentication] =
    useState<WifiAuthentication>("wpa2-psk");
  const [ssid, setSsid] = useState("");
  const [password, setPassword] = useState("");
  const [identity, setIdentity] = useState("");
  const [username, setUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasSsid = ssid.trim().length > 0;
  const hasRequiredCredentials =
    wifiAuthentication === "open" ||
    (password.length > 0 &&
      (wifiAuthentication !== "wpa2-enterprise" ||
        (identity.trim().length > 0 && username.trim().length > 0)));
  const hasValidWifi = !configureWifi || (hasSsid && hasRequiredCredentials);
  const isDisconnected = state === "disconnected";
  const serialReady = state === "ready" || state === "monitoring";
  const canFlash = serialReady && hasValidWifi && !isSubmitting;
  const controlsDisabled = !serialReady || isSubmitting;

  const handleSubmit: ComponentProps<"form">["onSubmit"] = async (event) => {
    event.preventDefault();

    if (!canFlash) return;

    const request: FlashRequest = {
      eraseFlash,
      wifi: configureWifi
        ? {
            ssid: ssid.trim(),
            authentication: wifiAuthentication,
            password: wifiAuthentication === "open" ? undefined : password,
            identity:
              wifiAuthentication === "wpa2-enterprise"
                ? identity.trim()
                : undefined,
            username:
              wifiAuthentication === "wpa2-enterprise"
                ? username.trim()
                : undefined,
          }
        : undefined,
    };

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await flashFirmware(request);
    } catch (error) {
      console.error("Failed to flash Lilota", error);
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card aria-disabled={!serialReady}>
      <CardHeader>
        <CardTitle>Flash</CardTitle>
      </CardHeader>

      <CardContent>
        {isDisconnected && (
          <p className="mb-4 text-sm text-muted-foreground">
            Connect a compatible device to configure and flash Lilota.
          </p>
        )}

        <form onSubmit={handleSubmit}>
          <fieldset
            disabled={controlsDisabled}
            className={`grid gap-6 ${isDisconnected ? "opacity-50" : ""}`}
          >
            <div className="grid gap-6 xl:grid-cols-2">
              <div className="grid content-start gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="lilota-build">Lilota build</Label>
                  <Select value="default" disabled>
                    <SelectTrigger id="lilota-build" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Additional builds will be available once automated releases are set up!
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="erase-flash"
                    checked={eraseFlash}
                    onCheckedChange={(checked) => setEraseFlash(checked === true)}
                    disabled={controlsDisabled}
                  />
                  <Label htmlFor="erase-flash">Erase existing flash</Label>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          disabled={controlsDisabled}
                          aria-label="About erasing existing flash"
                        />
                      }
                    >
                      <RiInformationLine />
                    </TooltipTrigger>
                    <TooltipContent>
                      Erases the entire device before flashing, including Lilota settings and files.
                    </TooltipContent>
                  </Tooltip>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="configure-wifi"
                    checked={configureWifi}
                    onCheckedChange={(checked) => setConfigureWifi(checked === true)}
                    disabled={controlsDisabled}
                  />
                  <Label htmlFor="configure-wifi">Configure Wi-Fi</Label>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          disabled={controlsDisabled}
                          aria-label="About Wi-Fi configuration"
                        />
                      }
                    >
                      <RiInformationLine />
                    </TooltipTrigger>
                    <TooltipContent>
                      If Wi-Fi configuration is disabled, Lilota will start its own access point.
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {configureWifi ? (
                <WifiFields
                  disabled={controlsDisabled}
                  ssid={ssid}
                  password={password}
                  identity={identity}
                  username={username}
                  authentication={wifiAuthentication}
                  onSsidChange={setSsid}
                  onPasswordChange={setPassword}
                  onIdentityChange={setIdentity}
                  onUsernameChange={setUsername}
                  onAuthenticationChange={setWifiAuthentication}
                />
              ) : (
                <div className="flex min-h-24 items-center border border-dashed px-4 py-3 text-sm text-muted-foreground">
                  Wi-Fi configuration is disabled. Lilota will start its own access point.
                </div>
              )}
            </div>

            {errorMessage && (
              <p role="alert" className="text-sm text-destructive">
                {errorMessage}
              </p>
            )}

            <div className="flex items-end gap-4">
              <Button type="submit" disabled={!canFlash} className="w-fit">
                <RiDownload2Line data-icon="inline-start" />
                {isSubmitting ? "Flashing..." : "Flash"}
              </Button>

              <Progress value={flashProgress} className="min-w-0 flex-1">
                <ProgressLabel>Flash progress</ProgressLabel>
                <ProgressValue />
              </Progress>
            </div>
          </fieldset>
        </form>
      </CardContent>
    </Card>
  );
}
