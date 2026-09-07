export const AI_NAME = process.env.NEXT_PUBLIC_AI_NAME || "Ate Sora";

export function getAIGreeting(language: "english" | "tagalog" | "cebuano" = "english"): string {
  switch (language) {
    case "tagalog":
      return `Kumusta! Ako si ${AI_NAME}, ang iyong Barangay AI Assistant. Paano kita matutulungan ngayon?`;
    case "cebuano":
      return `Maayong adlaw! Ako si ${AI_NAME}, ang imong Barangay AI Assistant. Unsaon tika pagtabang karon?`;
    case "english":
    default:
      return `Hello! I am ${AI_NAME}, your Barangay AI Assistant. How can I help you today?`;
  }
}

export function getVoiceIntro(language: "english" | "tagalog" | "cebuano" = "english"): string {
  switch (language) {
    case "tagalog":
      return `Ako si ${AI_NAME}. Nanonood at nakikinig ako.`;
    case "cebuano":
      return `Ako si ${AI_NAME}. Naminaw ko.`;
    case "english":
    default:
      return `I am ${AI_NAME}. I am listening.`;
  }
}
