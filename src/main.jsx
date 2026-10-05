import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App.jsx"
import ProfileStep from "./onboarding/ProfileStep.jsx"
import ExportStep from "./onboarding/ExportStep.jsx"
import QuestionsIntro from "./onboarding/QuestionsIntro.jsx"
import QuestionFlow from "./onboarding/QuestionFlow.jsx"
import ScorecardStep from "./onboarding/ScorecardStep.jsx"
import UploadStep from "./onboarding/UploadStep.jsx"
import { readSession } from "./onboarding/session.js"

const start = new URLSearchParams(window.location.search).get("start")
const session = readSession()

let root = <App />
if (start === "1") {
  root = <ProfileStep onDone={(result) => console.log("Profile step done:", result.name, result.isNew)} />
} else if (start === "2" && session) {
  root = <ExportStep email={session.email} token={session.token} onDone={(choice) => console.log("Export step done:", choice)} />
}

if (start === "6") {
  root = <UploadStep onFiles={(f) => console.log("Files read:", Object.keys(f.uploadedFiles))} onDone={() => console.log("Upload done")} />
}

if (start === "5" && session) {
  root = <ScorecardStep email={session.email} token={session.token} name={session.name} waiting={true} onDone={() => console.log("Scorecard done")} />
}

if (start === "4" && session) {
  root = <QuestionFlow email={session.email} token={session.token} initialAnswers={{}} onDone={(a) => console.log("Questions done:", a)} />
}

if (start === "3") {
  root = <QuestionsIntro waiting={new URLSearchParams(window.location.search).get("waiting") === "1"} onDone={() => console.log("Intro done")} />
}

ReactDOM.createRoot(document.getElementById("root")).render(<React.StrictMode>{root}</React.StrictMode>)
