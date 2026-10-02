import type { Metadata } from "next";
import OpportunityFeed from "@/components/opportunity-feed";

export const metadata: Metadata = { title: "Opportunities | OpportunityOS" };

export default function OpportunitiesPage() {
  return <OpportunityFeed />;
}
