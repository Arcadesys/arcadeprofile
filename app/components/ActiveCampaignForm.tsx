import SubscriptionForm from "./SubscriptionForm";
import type { Magnet, Source } from "@/lib/subscribe-types";

// Compatibility wrapper for existing page imports; no vendor script is loaded.
export type ActiveCampaignFormPresentation = "default" | "compact";
export type ActiveCampaignFormProps = {
  source?: Source;
  magnet?: Magnet;
  presentation?: ActiveCampaignFormPresentation;
};
export default function ActiveCampaignForm({
  source = "subscribe-page",
  magnet,
  presentation = "default",
}: ActiveCampaignFormProps) {
  return (
    <SubscriptionForm
      source={source}
      magnet={magnet}
      presentation={presentation}
      audiences={["all"]}
      updateMode="replace"
      showPreferences
    />
  );
}
