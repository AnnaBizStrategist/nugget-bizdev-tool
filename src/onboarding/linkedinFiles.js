import Papa from "papaparse"
import JSZip from "jszip"

// Works out which LinkedIn file a CSV is, from its file name.
// (Moved here from App.jsx so there is only one copy.)
export function getFileKey(name) {
  const lower = name.toLowerCase().replace(/[-_ ]/g, "")
  if (lower.includes("connection")) return "Connections"
  if (lower.includes("message")) return lower === "messages.csv" ? "Messages" : name.replace(".csv", "")
  if (lower.includes("recommendation") && lower.includes("received")) return "Recommendations_Received"
  if (lower.includes("recommendation") && lower.includes("given")) return "Recommendations_Given"
  if (lower.includes("recommendation")) return "Recommendations_Received"
  if (lower.includes("endorsementgiven")) return "Endorsements_Given"
  if (lower.includes("endorsementreceived")) return "Endorsements_Received"
  if (lower.includes("endorsement")) return "Endorsements_Received"
  if (lower.includes("skill")) return "Skills"
  if (lower.includes("position")) return "Positions"
  if (lower.includes("profile") && !lower.includes("summary")) return "Profile"
  if (lower.includes("comment")) return "Comments"
  if (lower.includes("reaction")) return "Reactions"
  if (lower.includes("share")) return "Shares"
  if (lower.includes("invitation")) return "Invitations"
  return name.replace(".csv", "")
}

// Turns the text of one CSV into rows. LinkedIn puts 3 lines of notes above the Connections table.
function parseCsvText(fileName, csvText) {
  const isConnections = fileName.toLowerCase().includes("connection")
  const text = isConnections ? csvText.split("\n").slice(3).join("\n") : csvText
  return Papa.parse(text, { header: true, skipEmptyLines: true }).data
}

// Reads dropped files (zip or loose csv). Everything stays in the browser.
// Returns { uploadedFiles: { Connections: "Connections.csv", ... }, parsedData: { Connections: [rows], ... } }
export async function readLinkedInFiles(fileList) {
  const uploadedFiles = {}
  const parsedData = {}

  async function addCsv(fileName, readText) {
    if (!fileName.toLowerCase().endsWith(".csv")) return
    const rows = parseCsvText(fileName, await readText())
    if (rows.length > 0) {
      const key = getFileKey(fileName)
      uploadedFiles[key] = fileName
      parsedData[key] = rows
    }
  }

  for (const file of Array.from(fileList)) {
    const lowerName = file.name.toLowerCase()
    if (lowerName.endsWith(".zip")) {
      const zip = await JSZip.loadAsync(file)
      const entries = []
      zip.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir) entries.push({ fileName: relativePath.split("/").pop(), zipEntry })
      })
      for (const { fileName, zipEntry } of entries) {
        await addCsv(fileName, () => zipEntry.async("string"))
      }
    } else if (lowerName.endsWith(".csv")) {
      await addCsv(file.name, () => file.text())
    }
  }

  return { uploadedFiles, parsedData }
}

// Basic file = the quick one (Connections is always in it). Complete file adds Comments and Shares.
export function basicReceived(uploadedFiles) {
  return Boolean(uploadedFiles && uploadedFiles.Connections)
}
export function completeReceived(uploadedFiles) {
  return Boolean(uploadedFiles && (uploadedFiles.Comments || uploadedFiles.Shares))
}
