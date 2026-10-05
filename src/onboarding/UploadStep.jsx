import { useRef, useState } from "react"
import OnboardingShell, { ui } from "./OnboardingShell.jsx"
import { readLinkedInFiles, basicReceived, completeReceived } from "./linkedinFiles.js"

const BASIC_UNLOCKS =
  "Unlocks: The Open Door, The Line-Up and The Field Report, plus the Gold reports: The Warm List, Hidden Nuggets and Inbound"
const COMPLETE_UNLOCKS = "Unlocks: The Outbound Report and The Gold Nugget"

function StatusCard({ title, received, waitingNote, unlocks }) {
  return (
    <div
      style={{
        border: `1px solid ${received ? "#2f84d4" : "#1e4080"}`,
        background: received ? "#0d2a52" : "#0a1628",
        borderRadius: 12,
        padding: "16px 18px",
        display: "flex",
        gap: 14,
        alignItems: "flex-start",
      }}
    >
      <span
        style={{
          width: 30,
          height: 30,
          borderRadius: 15,
          background: received ? "#13406e" : "#16305e",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {received ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7ec8f5" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9fc4e8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
        )}
      </span>
      <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 15.5, fontWeight: 700 }}>{title}</span>
          <span style={{ fontSize: 13, fontWeight: received ? 700 : 600, color: received ? "#7ec8f5" : "#9fc4e8" }}>
            {received ? "Received" : "Waiting"}
          </span>
        </div>
        {!received && <span style={{ fontSize: 13.5, color: "#9fc4e8" }}>{waitingNote}</span>}
        <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "#c9dcf3" }}>{unlocks}</span>
      </div>
    </div>
  )
}

function DropZone({ compact, busy, onFiles }) {
  const inputRef = useRef(null)
  const [over, setOver] = useState(false)

  function handleDrop(e) {
    e.preventDefault()
    setOver(false)
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) onFiles(e.dataTransfer.files)
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={handleDrop}
      style={{
        border: "2px dashed #2f84d4",
        borderRadius: 16,
        background: over ? "#103060" : "#0c2348",
        padding: compact ? "22px 24px" : "36px 24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        textAlign: "center",
      }}
    >
      {!compact && (
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#7ec8f5" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 16V4" />
          <path d="M7 9l5-5 5 5" />
          <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
        </svg>
      )}
      <span style={{ fontFamily: "Georgia, serif", fontSize: compact ? 17 : 20, fontWeight: 700 }}>
        {busy ? "Reading your file..." : compact ? "Complete file arrived? Drop it here" : "Drop your LinkedIn file here"}
      </span>
      <span style={{ fontSize: 14, lineHeight: 1.55, color: "#c9dcf3" }}>Drag the zip file here. No need to unzip it.</span>
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current && inputRef.current.click()}
        style={{
          height: 44,
          padding: "0 22px",
          border: "1px solid #41a1e8",
          borderRadius: 10,
          background: "transparent",
          color: "#e8f0fe",
          fontSize: 15,
          fontWeight: 600,
          fontFamily: "inherit",
          cursor: "pointer",
        }}
      >
        Choose file
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".zip,.csv"
        multiple
        style={{ display: "none" }}
        onChange={(e) => {
          if (e.target.files && e.target.files.length) onFiles(e.target.files)
          e.target.value = ""
        }}
      />
    </div>
  )
}

// initialFiles: { uploadedFiles, parsedData } already read this session (optional)
// onFiles({ uploadedFiles, parsedData }): called every time new files are read, with everything so far
// onDone(): they clicked the button to see their reports
export default function UploadStep({ initialFiles, onFiles, onDone, onSkip }) {
  const [uploadedFiles, setUploadedFiles] = useState((initialFiles && initialFiles.uploadedFiles) || {})
  const [parsedData, setParsedData] = useState((initialFiles && initialFiles.parsedData) || {})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const basic = basicReceived(uploadedFiles)
  const complete = completeReceived(uploadedFiles)

  async function handle(fileList) {
    if (busy) return
    setBusy(true)
    setError("")
    try {
      const result = await readLinkedInFiles(fileList)
      if (Object.keys(result.uploadedFiles).length === 0) {
        setError("We couldn't find any LinkedIn files in that. Please drop the zip file LinkedIn emailed you.")
      } else {
        const nextFiles = { ...uploadedFiles, ...result.uploadedFiles }
        const nextData = { ...parsedData, ...result.parsedData }
        setUploadedFiles(nextFiles)
        setParsedData(nextData)
        if (onFiles) onFiles({ uploadedFiles: nextFiles, parsedData: nextData })
      }
    } catch (e) {
      setError("We couldn't read that file. Please check it's the zip LinkedIn sent and try again.")
    }
    setBusy(false)
  }

  let heading = "Drop in your LinkedIn files"
  let lead =
    "LinkedIn sends two separate emails. The first one unlocks six of your eight reports, so drop it in as soon as it arrives. Nugget works out which file is which."
  if (basic && !complete) {
    heading = "Six reports are ready for you"
    lead = "Your Basic file is in. Start with your free reports now. The Complete file adds the last two when LinkedIn sends it."
  } else if (basic && complete) {
    heading = "All eight reports are ready for you"
    lead = "Both of your LinkedIn files are in. Your reports are ready whenever you are."
  }

  return (
    <OnboardingShell step={4}>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h1 style={ui.h1}>{heading}</h1>
          <p style={ui.lead}>{lead}</p>
        </div>

                {!basic && onSkip && (
  <>
    <button
      type="button"
      onClick={onSkip}
      style={{
        width: "100%",
        padding: "14px 18px",
        fontSize: 16,
        fontWeight: 700,
        color: "#e8f0fe",
        background: "#0d2a52",
        border: "1px solid #41a1e8",
        borderRadius: 12,
        cursor: "pointer",
      }}
    >
      Open my saved reports →
    </button>
    <p style={{ margin: 0, fontSize: 13, color: "#9fc4e8", textAlign: "center" }}>
      or add new LinkedIn files below
    </p>
  </>
)}
{!basic && <DropZone busy={busy} onFiles={handle} />}
        
        {error && <p style={ui.error}>{error}</p>}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <StatusCard title="Basic file" received={basic} waitingNote="Usually arrives within minutes" unlocks={BASIC_UNLOCKS} />
          <StatusCard title="Complete file" received={complete} waitingNote="Arrives within 24 hours" unlocks={COMPLETE_UNLOCKS} />
        </div>

        {basic && (
          <button type="button" style={ui.primaryButton} onClick={onDone}>
            {complete ? "See your reports" : "See your Open Door report"}
          </button>
        )}

        {basic && !complete && <DropZone compact busy={busy} onFiles={handle} />}

        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "#9fc4e8", textAlign: "center" }}>
          {basic
            ? "Your reports already use the ideal client you described, so the matches are yours, not a guess. Gold reports use a credit."
            : "Nugget reads your files right here in your browser. Your LinkedIn data is never stored on our servers."}
        </p>
      </div>
    </OnboardingShell>
  )
}
