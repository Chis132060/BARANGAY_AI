import { ChatInterface } from "@/components/chat/ChatInterface";

export const metadata = {
  title: "AI Barangay Assistant | Smart Barangay",
  description: "Ask about barangay clearances, policies, certificates, events, and more.",
};

export default function ChatPage() {
  return (
    <main className="flex h-full min-h-0 w-full flex-col">
      <ChatInterface />
    </main>
  );
}
