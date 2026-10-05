import { useState } from "react"
import OnboardingFlow from "./OnboardingFlow.jsx"
import App from "../App.jsx"

// Shows the new onboarding first. When it finishes, hands everything to the app.
export default function OnboardingGate() {
  const [onboarded, setOnboarded] = useState(null)
  if (onboarded) return <App onboarded={onboarded} />
  return <OnboardingFlow onFinished={setOnboarded} />
}
