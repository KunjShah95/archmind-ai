const SLACK_KEY = "archmind_slack_webhook";

export function getSlackWebhook(): string {
  return localStorage.getItem(SLACK_KEY) ?? "";
}

export function setSlackWebhook(url: string) {
  if (url.trim()) localStorage.setItem(SLACK_KEY, url.trim());
  else localStorage.removeItem(SLACK_KEY);
}
