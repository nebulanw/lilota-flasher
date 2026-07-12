import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WifiAuthentication } from "@/types/flash";

type WifiFieldsProps = {
  disabled: boolean;
  ssid: string;
  password: string;
  identity: string;
  username: string;
  authentication: WifiAuthentication;
  onSsidChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onIdentityChange: (value: string) => void;
  onUsernameChange: (value: string) => void;
  onAuthenticationChange: (value: WifiAuthentication) => void;
};

export function WifiFields({
  disabled,
  ssid,
  password,
  identity,
  username,
  authentication,
  onSsidChange,
  onPasswordChange,
  onIdentityChange,
  onUsernameChange,
  onAuthenticationChange,
}: WifiFieldsProps) {
  const isOpenNetwork = authentication === "open";
  const isEnterprise = authentication === "wpa2-enterprise";

  const authenticationLabel = {
    open: "Open",
    "wpa2-psk": "WPA2-Personal",
    "wpa2-enterprise": "WPA2-Enterprise",
  }[authentication];

  return (
    <fieldset
      disabled={disabled}
      className="grid content-start gap-4 disabled:opacity-50"
    >
      <div className="grid gap-2">
        <Label htmlFor="wifi-authentication">Authentication</Label>
        <Select
          value={authentication}
          onValueChange={(value) => onAuthenticationChange(value as WifiAuthentication)}
          disabled={disabled}
        >
          <SelectTrigger id="wifi-authentication" className="w-full">
            <SelectValue>{authenticationLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="wpa2-psk">WPA2-Personal</SelectItem>
            <SelectItem value="wpa2-enterprise">WPA2-Enterprise</SelectItem>
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

      {isEnterprise && (
        <>
          <div className="grid gap-2">
            <Label htmlFor="wifi-identity">Identity</Label>
            <Input
              id="wifi-identity"
              value={identity}
              onChange={(event) => onIdentityChange(event.currentTarget.value)}
              disabled={disabled}
              autoComplete="off"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="wifi-username">Username</Label>
            <Input
              id="wifi-username"
              value={username}
              onChange={(event) => onUsernameChange(event.currentTarget.value)}
              disabled={disabled}
              autoComplete="username"
            />
          </div>
        </>
      )}

      {!isOpenNetwork && (
        <div className="grid gap-2">
          <Label htmlFor="wifi-password">Password</Label>
          <Input
            id="wifi-password"
            type="password"
            value={password}
            onChange={(event) => onPasswordChange(event.currentTarget.value)}
            disabled={disabled}
            autoComplete="new-password"
          />
        </div>
      )}
    </fieldset>
  );
}
