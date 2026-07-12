import type { WifiConfiguration } from "@/types/flash";

const LILOTA_PROMPT_REGEX = /[^\r\n]*:\/# $/;
const COMMAND_CHARACTER_DELAY_MS = 2;
const COMMAND_SETTLE_DELAY_MS = 250;

type SerialWriter = (data: string) => Promise<void>;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function tclBrace(value: string) {
  return `{${value.replaceAll("\\", "\\\\").replaceAll("}", "\\}")}}`;
}

async function sendLilotaCommand(write: SerialWriter, command: string) {
  for (const character of command) {
    await write(character);
    await sleep(COMMAND_CHARACTER_DELAY_MS);
  }

  await write("\r");
  await sleep(COMMAND_SETTLE_DELAY_MS);
}

export function isLilotaPrompt(line: string) {
  return LILOTA_PROMPT_REGEX.test(line);
}

export async function configureLilotaWifi(
  write: SerialWriter,
  configuration: WifiConfiguration,
) {
  const authenticationMode = configuration.authentication === "wpa2-enterprise"
    ? "wpa2_enterprise"
    : "wpa2_psk";
  const password = configuration.authentication === "open"
    ? ""
    : configuration.password ?? "";

  await sendLilotaCommand(
    write,
    `config set wifi_auth_mode ${authenticationMode}`,
  );
  await sendLilotaCommand(
    write,
    `config set wifi_ssid ${tclBrace(configuration.ssid)}`,
  );
  await sendLilotaCommand(write, `config set wifi_pass ${tclBrace(password)}`);

  if (configuration.authentication === "wpa2-enterprise") {
    await sendLilotaCommand(
      write,
      `config set wifi_identity ${tclBrace(configuration.identity ?? "")}`,
    );
    await sendLilotaCommand(
      write,
      `config set wifi_username ${tclBrace(configuration.username ?? "")}`,
    );
  }

  // Lilota reloads its Wi-Fi configuration during startup.
  await sendLilotaCommand(write, "reboot");
}
