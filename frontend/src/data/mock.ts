export type Screen =
  "overview" | "map" | "plan" | "history" | "lab" | "trust" | "settings";
export type FixStatus = "open" | "later" | "done";
export interface Fix {
  id: string;
  title: string;
  service: string;
  impact: number;
  minutes: number;
  description: string;
  steps: string[];
  help?: string;
}
export interface Service {
  id: string;
  name: string;
  short: string;
  score: number;
  fields: number;
  summary: string;
  evidence: string[];
  why: string;
  x: number;
  y: number;
}
export interface Activity {
  id: string;
  title: string;
  detail: string;
  score: number;
  at: string;
  action?: FixStatus;
}

// All illustrative product content lives here. No account connection is required.
export const mock = {
  user: {
    name: "Harshika",
    fullName: "Harshika Thopte",
    initials: "HT",
    profile: "Personal privacy overview",
  },
  baseScore: 72,
  weeklyTrend: [79, 77, 75, 72],
  notifications: [
    {
      id: "weekly",
      title: "Weekly check is ready",
      detail: "Sample notification. Review the illustrative weekly comparison.",
      daysAgo: 0,
    },
    {
      id: "plan",
      title: "Your privacy plan is ready",
      detail: "Sample notification. Choose a change to explore.",
      daysAgo: 2,
    },
  ],
  previousScore: 79,
  navigation: [
    { id: "overview", label: "Overview" },
    { id: "map", label: "Exposure map" },
    { id: "plan", label: "Privacy plan" },
    { id: "history", label: "History" },
    { id: "lab", label: "Lab" },
    { id: "trust", label: "Trust centre" },
  ] as { id: Screen; label: string }[],
  categories: [
    {
      id: "identity",
      name: "Identity",
      score: 82,
      detail: "Your phone and profile details",
    },
    {
      id: "behaviour",
      name: "Behaviour",
      score: 74,
      detail: "Activity used to build a profile",
    },
    {
      id: "location",
      name: "Location",
      score: 61,
      detail: "Where you go and when",
    },
    {
      id: "financial",
      name: "Financial",
      score: 39,
      detail: "Stored payment and order details",
    },
  ],
  services: [
    {
      id: "social",
      name: "Social profile",
      short: "SP",
      score: 86,
      fields: 6,
      summary: "Your phone number is visible beyond your contacts.",
      why: "A visible phone number can connect accounts to the same person. Choose who should be able to see it.",
      evidence: [
        "Phone number visible on profile",
        "Contact discovery enabled",
        "Activity used for personalised ads",
      ],
      x: 265,
      y: 138,
    },
    {
      id: "google",
      name: "Google",
      short: "G",
      score: 72,
      fields: 8,
      summary: "Location history and activity create a detailed picture.",
      why: "Saved places and searches can reveal routines. Review future collection and older saved activity separately.",
      evidence: [
        "Timeline (location history) enabled",
        "Search activity retained",
        "Personalised recommendations enabled",
      ],
      x: 480,
      y: 145,
    },
    {
      id: "shop",
      name: "ShopCart",
      short: "SC",
      score: 48,
      fields: 5,
      summary: "An address and an unused payment method are saved.",
      why: "Saved addresses and payment methods leave more personal details in an account. Remove details you no longer need stored.",
      evidence: [
        "Delivery address stored",
        "Saved payment method present",
        "Order history retained",
      ],
      x: 170,
      y: 365,
    },
    {
      id: "music",
      name: "Soundwave",
      short: "SW",
      score: 24,
      fields: 3,
      summary: "Listening activity is stored for recommendations.",
      why: "Listening history can suggest interests. Review recommendations and profile visibility together.",
      evidence: [
        "Listening activity retained",
        "Device type recorded",
        "Profile visibility limited",
      ],
      x: 575,
      y: 380,
    },
  ] as Service[],
  fixes: [
    {
      id: "phone",
      title: "Hide my phone number",
      service: "Social profile",
      impact: 7,
      minutes: 2,
      description:
        "Limit who can find your profile using your number. Your number can stay on the account for recovery.",
      steps: [
        "Open your social account’s privacy settings.",
        "Review phone visibility and contact discovery.",
        "Choose the audience you want, save, then return here.",
      ],
    },
    {
      id: "location",
      title: "Pause location history",
      help: "https://support.google.com/accounts/answer/14200149?hl=en",
      service: "Google",
      impact: 6,
      minutes: 3,
      description:
        "Stop adding new places to your saved timeline. Previously saved places may need a separate review.",
      steps: [
        "Open your Google Account and go to the Timeline section.",
        "Turn Timeline off at the top of that section.",
        "Review the confirmation. Previously saved places and other location settings need a separate review.",
      ],
    },
    {
      id: "ads",
      title: "Limit personalised ads",
      service: "Across services",
      impact: 4,
      minutes: 3,
      description:
        "Reduce the use of your activity for personalised advertising. You may still see ads.",
      steps: [
        "Open the service’s ad or privacy settings.",
        "Review how your activity is used for ads.",
        "Turn off the options you do not want and save.",
      ],
    },
    {
      id: "card",
      title: "Remove an unused saved card",
      service: "ShopCart",
      impact: 3,
      minutes: 2,
      description:
        "Remove a payment method you no longer use. This does not cancel subscriptions or remove order history.",
      steps: [
        "Open saved payment methods in your shopping account.",
        "Check which payment method is no longer needed.",
        "Remove it only after checking active subscriptions.",
      ],
    },
  ] as Fix[],
  initialActivity: [
    {
      id: "sample-baseline",
      title: "Your sample overview is ready",
      detail:
        "Four services brought into one view. This is an illustrative baseline.",
      score: 72,
      at: new Date().toISOString(),
    },
  ] as Activity[],
  labGroups: [
    {
      name: "Find leaks",
      description: "Understand what an export or document reveals.",
      tools: [
        {
          id: "canary",
          title: "Track who leaks your email",
          detail: "See how a service-specific email marker helps trace reuse.",
          icon: "mail",
        },
        {
          id: "document",
          title: "Review a document",
          detail: "Inspect a file locally without sending it anywhere.",
          icon: "file",
        },
        {
          id: "coverage",
          title: "Check what an export includes",
          detail: "Understand the limits of the evidence you have.",
          icon: "scan",
        },
      ],
    },
    {
      name: "Simulate changes",
      description: "Explore an action before deciding what to do.",
      tools: [
        {
          id: "simulate",
          title: "Preview a privacy change",
          detail: "See the sample score impact before marking a fix done.",
          icon: "sliders",
        },
        {
          id: "perspective",
          title: "See another perspective",
          detail: "Review what a stranger could infer from the same details.",
          icon: "eye",
        },
      ],
    },
    {
      name: "Protect family",
      description: "Start a conversation with someone you care about.",
      tools: [
        {
          id: "family",
          title: "Review a family checklist",
          detail:
            "Explore shared-device and profile-visibility settings together.",
          icon: "family",
        },
      ],
    },
  ],
  changedData: {
    phone:
      "Phone visibility is marked limited in the sample. Contact discovery remains a separate setting.",
    location:
      "New Timeline saves are marked paused in the sample. Previously saved places remain.",
    ads: "Use of activity for personalised ads is marked limited in the sample.",
    card: "The unused saved payment method is marked removed in the sample. Order history remains.",
  } as Record<string, string>,
  familyChecklist: [
    "Agree on what you want to review together.",
    "Check who can see each person’s profile.",
    "Review shared-device location permissions.",
    "Let each person choose their own settings.",
  ],
  advancedTools: [
    {
      id: "sensitive",
      title: "Spot sensitive details",
      description: "Review a redacted sample of identity and document details.",
    },
    {
      id: "public",
      title: "Review public exposure",
      description:
        "Explore the details that make a sample profile discoverable.",
    },
    {
      id: "optout",
      title: "Understand opt-out choices",
      description: "See what a browser privacy preference can and cannot do.",
    },
    {
      id: "habit",
      title: "Build a privacy habit",
      description: "Keep progress tied to useful actions, not a perfect score.",
    },
  ],
  exportGuides: [
    {
      service: "Google",
      help: "https://support.google.com/accounts/answer/3024190?hl=en",
      steps: [
        "Open Google Takeout and select the data you want to download.",
        "Choose the archive options and create an export. Download it when it is ready.",
        "Extract the archive on your device and choose an individual JSON or CSV file under 2 MB for this preview.",
      ],
    },
    {
      service: "Instagram",
      help: "https://about.fb.com/news/2023/10/manage-your-information-across-apps/",
      steps: [
        "Open Instagram settings and Accounts Center.",
        "Find Download your information and choose your Instagram account. Names can vary by version.",
        "Download to your device, extract the archive, then choose an individual JSON file under 2 MB.",
      ],
    },
  ],
  exportSteps: [
    "Open the service’s privacy or data settings.",
    "Choose to download a copy of your information.",
    "Choose JSON or CSV when it is offered.",
    "Preview that file here. It stays in this browser.",
  ],
  faq: [
    {
      q: "Do I need to connect an account?",
      a: "No. Start with sample data to explore your privacy overview. You can also preview a JSON or CSV file in your browser without signing in.",
    },
    {
      q: "What does the score mean?",
      a: "The score organises observed personal details on a scale from 0 to 100. Lower is better. It is a guide to your next step, not a guarantee that every risk has been found.",
    },
    {
      q: "What happens when I mark a fix done?",
      a: "Your sample plan and score update so you can explore the experience. DigiMirror does not change settings in other services. A real change needs to be reviewed in that service.",
    },
    {
      q: "Where does my file go?",
      a: "It stays in this browser. The file preview reads it locally, keeps only a summary for this browser session, and sends no file content to a server. You can clear the summary in Trust centre.",
    },
  ],
};

export const riskFor = (score: number) =>
  score >= 85
    ? {
        label: "Critical exposure",
        tone: "critical",
        sentence:
          "Visible identity details can identify you. Review your phone visibility first.",
      }
    : score >= 60
      ? {
          label: "High exposure",
          tone: "high",
          sentence:
            "Visible details can connect your accounts. Start by hiding your phone number.",
        }
      : score >= 35
        ? {
            label: "Moderate exposure",
            tone: "moderate",
            sentence:
              "Fewer details are exposed in this sample. Review the next action in your plan.",
          }
        : {
            label: "Lower exposure",
            tone: "protected",
            sentence:
              "Fewer visible details were found in this sample. Review remaining settings; this is not a safety guarantee.",
          };

export const dateLabel = () =>
  new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Asia/Kolkata",
  }).format(new Date());

/** Keep the sample map and its descriptions aligned with sample-plan choices. */
export function servicesFor(statuses: Record<string, FixStatus>): Service[] {
  return mock.services.map((service) => {
    const ids =
      service.id === "social"
        ? ["phone", "ads"]
        : service.id === "google"
          ? ["location"]
          : service.id === "shop"
            ? ["card"]
            : [];
    const completed = mock.fixes.filter(
      (f) => ids.includes(f.id) && statuses[f.id] === "done",
    );
    if (!completed.length) return service;
    const evidence = service.evidence.filter(
      (e) =>
        !(
          statuses.phone === "done" &&
          service.id === "social" &&
          /Phone number visible/.test(e)
        ) &&
        !(
          statuses.ads === "done" &&
          service.id === "social" &&
          /personalised ads/.test(e)
        ) &&
        !(
          statuses.card === "done" &&
          service.id === "shop" &&
          /payment method/.test(e)
        ) &&
        !(
          statuses.location === "done" &&
          service.id === "google" &&
          /Timeline/.test(e)
        ),
    );
    return {
      ...service,
      score: service.score - completed.reduce((n, f) => n + f.impact, 0),
      summary:
        completed.map((f) => f.title).join("; ") +
        " marked done in your sample plan.",
      evidence: [
        ...completed.map((f) => f.title + " marked done in this view"),
        ...evidence,
      ],
    };
  });
}
