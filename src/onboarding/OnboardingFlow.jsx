import { useState } from "react"
import OnboardingShell, { ui } from "./OnboardingShell.jsx"
import ProfileStep from "./ProfileStep.jsx"
import ExportStep from "./ExportStep.jsx"
import QuestionsIntro from "./QuestionsIntro.jsx"
import QuestionFlow from "./QuestionFlow.jsx"
import ScorecardStep from "./ScorecardStep.jsx"
import UploadStep from "./UploadStep.jsx"
import { basicReceived } from "./linkedinFiles.js"

async function callApi(user, body) {
  const res = await fetch("/api/onboarding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: user.email, token: user.token, ...body }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.success) throw new Error(data.error || "Something went wrong.")
  return data
}

// Remember where they are, so a returning person picks up here. Never blocks the flow.
async function saveStep(user, step) {
  try {
    await callApi(user, { action: "save", step })
  } catch (e) {
    console.warn("Could not save step", step)
  }
}

// Which screen should a person see, given what the server has saved?
function screenFor(profile) {
  const step = (profile && profile.currentStep) || "profile"
    if (step === "reports") return "upload" // came back after finishing: files aren't stored, so ask again
  if (step === "upload") return "upload"
  if (step === "questions") return profile.completedAt ? "scorecard" : "intro"
  return "export"
}

// onFinished({ email, token, name, uploadedFiles, parsedData }): called when onboarding is over
// and the person should land on their reports.
export default function OnboardingFlow({ onFinished }) {
  const [screen, setScreen] = useState("profile")
  const [user, setUser] = useState(null) // { email, token, name }
  const [profile, setProfile] = useState(null) // saved profile from the server
  const [scored, setScored] = useState(false)
  const [files, setFiles] = useState({ uploadedFiles: {}, parsedData: {} })
    const [loadError, setLoadError] = useState("")
  const [returning, setReturning] = useState(false) // finished onboarding on an earlier visit

  const hasBasic = basicReceived(files.uploadedFiles)
  const isScored = scored || Boolean(profile && profile.completedAt)

  async function loadProfile(u) {
    setLoadError("")
    setScreen("loading")
    try {
      const data = await callApi(u, { action: "load" })
      const p = data.profile || {}
      setProfile(p)
            if (p.completedAt) setScored(true)
      if (p.currentStep === "reports") setReturning(true)
      const next = screenFor(p)
      if (next === "finished") finish(u, p.answers)
      else setScreen(next)
    } catch (e) {
      setLoadError(e.message || "Something went wrong.")
      setScreen("loadError")
    }
  }

  function handleProfileDone(result) {
        const u = { email: result.email, token: result.token, name: result.name }
    setUser(u)
    if (result.isNew) {
      // Feeds the Kit newsletter list, same as the old sign-up pop-up did.
      fetch("https://hook.us2.make.com/xu7d06pva2t2hhyccr86ddar7msqm4zl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: result.name, email: result.email, source: "nugget-free-user" }),
      }).catch((err) => console.log("Webhook error:", err))
    }
    loadProfile(u)
  }

    function finish(u, answersNow) {
    const answers = answersNow || (profile && profile.answers) || {}
    setScreen("finished")
    if (u) saveStep(u, "reports")
    if (onFinished) {
      onFinished({
        ...(u || user),
        uploadedFiles: files.uploadedFiles,
        parsedData: files.parsedData,
        idealClient: answers.ideal_client || "",
        clientProblem: answers.client_problem || "",
      })
    }
  }

  function goToQuestions() {
    saveStep(user, "questions")
    setScreen(isScored ? "scorecard" : "intro")
  }

  function handleExportDone(choice) {
    if (choice === "requested") {
      goToQuestions()
    } else {
      saveStep(user, "upload")
      setScreen("upload")
    }
  }

  function handleUploadDone() {
    if (isScored) finish(user)
    else goToQuestions()
  }

  function handleScorecardDone() {
    if (hasBasic) finish(user)
    else {
      saveStep(user, "upload")
      setScreen("upload")
    }
  }

  if (screen === "profile") return <ProfileStep onDone={handleProfileDone} />

  if (screen === "loading") {
    return (
      <OnboardingShell step={1}>
        <p style={ui.lead}>Getting your profile...</p>
      </OnboardingShell>
    )
  }

  if (screen === "loadError") {
    return (
      <OnboardingShell step={1}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <h1 style={ui.h1}>We couldn't load your profile</h1>
          <p style={ui.error}>{loadError}</p>
          <button type="button" style={ui.primaryButton} onClick={() => loadProfile(user)}>
            Try again
          </button>
        </div>
      </OnboardingShell>
    )
  }

  if (screen === "export") return <ExportStep email={user.email} token={user.token} onDone={handleExportDone} />

  if (screen === "intro") {
    const waiting = Boolean(profile && profile.exportRequestedAt) && !hasBasic
    return <QuestionsIntro waiting={waiting} onDone={() => setScreen("questions")} />
  }

  if (screen === "questions") {
    return (
      <QuestionFlow
        email={user.email}
        token={user.token}
        initialAnswers={(profile && profile.answers) || {}}
        onDone={(answers) => {
          setProfile((p) => ({ ...(p || {}), answers }))
          setScored(true)
          setScreen("scorecard")
        }}
      />
    )
  }

  if (screen === "scorecard") {
    return (
      <ScorecardStep
        email={user.email}
        token={user.token}
        name={user.name}
        waiting={!hasBasic}
        onDone={handleScorecardDone}
      />
    )
  }

  if (screen === "upload") {
        return (
      <UploadStep
        initialFiles={files}
        onFiles={setFiles}
        onDone={handleUploadDone}
        onSkip={returning ? () => finish(user) : undefined}
      />
    )
  }

  // "finished": the app takes over from here (wired up in a later step)
  return (
    <OnboardingShell step={5}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h1 style={ui.h1}>You're all set</h1>
        <p style={ui.lead}>Your reports are on their way.</p>
      </div>
    </OnboardingShell>
  )
}
