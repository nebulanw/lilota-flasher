import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WifiSecurity } from "@/types/flash";

type WifiFieldsProps = {
  disabled: boolean;
  ssid: string;
  password: string;
  security: WifiSecurity;
  onSsidChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSecurityChange: (value: WifiSecurity) => void;
};

export function WifiFields({
  disabled,
  ssid,
  password,
  security,
  onSsidChange,
  onPasswordChange,
  onSecurityChange,
}: WifiFieldsProps) {
  const isOpenNetwork = security === "open";

  return (
    <fieldset disabled={disabled} className="grid gap-4 disabled:opacity-50">
      <div className="grid gap-2">
        <Label htmlFor="wifi-security">Security</Label>
        <Select
          value={security}
          onValueChange={(value) => onSecurityChange(value as WifiSecurity)}
          disabled={disabled}
        >
          <SelectTrigger id="wifi-security" className="w-full">
            <SelectValue>
              {security === "open" ? "Open" : "WPA2-Personal"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="wpa2-personal">WPA2-Personal</SelectItem>
            <SelectItem value="open">Open</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="wifi-ssid">SSID</Label>
        <Input
          id="wifi-ssid"
          value={ssid}
          onChange={(event) => onSsidChange(event.currentTarget.value)}
          disabled={disabled}
          autoComplete="off"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="wifi-password">Password</Label>
        <Input
          id="wifi-password"
          type="password"
          value={isOpenNetwork ? "" : password}
          onChange={(event) => onPasswordChange(event.currentTarget.value)}
          disabled={disabled || isOpenNetwork}
          placeholder={isOpenNetwork ? "Not required" : undefined}
          autoComplete="new-password"
        />
      </div>
    </fieldset>
  );
}
