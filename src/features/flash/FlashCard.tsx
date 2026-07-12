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
import type { FlashRequest, WifiSecurity } from "@/types/flash";
import { WifiFields } from "./WifiFields";

export function FlashCard() {
  const { flashFirmware, flashProgress, state } = useSerial();
  const [eraseFlash, setEraseFlash] = useState(false);
  const [configureWifi, setConfigureWifi] = useState(false);
  const [wifiSecurity, setWifiSecurity] = useState<WifiSecurity>("wpa2-personal");
  const [ssid, setSsid] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasSsid = ssid.trim().length > 0;
  const hasRequiredPassword = wifiSecurity === "open" || password.length > 0;
  const hasValidWifi = !configureWifi || (hasSsid && hasRequiredPassword);
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
            security: wifiSecurity,
            password: wifiSecurity === "open" ? undefined : password,
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
        {!serialReady && (
          <p className="mb-4 text-xs text-muted-foreground">
            Connect a compatible device to configure and flash Lilota.
          </p>
        )}

        <form onSubmit={handleSubmit}>
          <fieldset
            disabled={controlsDisabled}
            className="grid gap-6 disabled:opacity-50"
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
                  <p className="text-xs text-muted-foreground">
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

              <WifiFields
                disabled={!configureWifi || controlsDisabled}
                ssid={ssid}
                password={password}
                security={wifiSecurity}
                onSsidChange={setSsid}
                onPasswordChange={setPassword}
                onSecurityChange={setWifiSecurity}
              />
            </div>

            {errorMessage && (
              <p role="alert" className="text-xs text-destructive">
                {errorMessage}
              </p>
            )}

            <div className="flex items-end gap-4">
              <Button type="submit" disabled={!canFlash} className="w-fit">
                <RiDownload2Line data-icon="inline-start" />
                {isSubmitting ? "Flashing..." : "Flash"}
              </Button>

              <Progress value={flashProgress} className="min-w-0 flex-1">
                <ProgressLabel>Upload Progress</ProgressLabel>
                <ProgressValue />
              </Progress>
            </div>
          </fieldset>
        </form>
      </CardContent>
    </Card>
  );
}
