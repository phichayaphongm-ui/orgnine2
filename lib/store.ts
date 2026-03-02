import type { OrgRecord, AgmRecord } from "./types"
import * as XLSX from "xlsx"
import { storageService } from "./storage-service"
import { excelService } from "./excel-service"

// ========== Reactive state with listeners ==========
let state = {
  orgData: [] as OrgRecord[],
  agmData: [] as AgmRecord[],
  loading: true,
  error: null as string | null,
  imageCache: {} as Record<string, string>,
}

let listeners: (() => void)[] = []

function updateState(patch: Partial<typeof state>) {
  state = { ...state, ...patch }
  notify()
}

function notify() {
  listeners.forEach((fn) => fn())
}

export function subscribe(fn: () => void) {
  listeners.push(fn)
  return () => {
    listeners = listeners.filter((l) => l !== fn)
  }
}

export function getState() {
  return state
}

// ========== Re-derive AGM data from ORG data ==========
function regenerateAgmFromOrg(orgData: OrgRecord[], existingAgm: AgmRecord[]): AgmRecord[] {
  const uniqueAgms = new Map<string, { zone: string; phone: string; position: string; imageUrl: string; localImage: string }>()

  orgData.forEach(row => {
    const name = row["Line Manager name"]
    if (name && !uniqueAgms.has(name)) {
      uniqueAgms.set(name, {
        zone: row["Region"] || "",
        phone: row["AGM Mobile"] || "",
        position: row["LM's Position title"] || "",
        imageUrl: row["AGM Image URL"] || "",
        localImage: row["_localImage"] || "",
      })
    }
  })

  const existingMap = new Map<string, AgmRecord>()
  existingAgm.forEach(a => existingMap.set(a["AGM Name"], a))

  const result: AgmRecord[] = []
  uniqueAgms.forEach((orgInfo, name) => {
    const existing = existingMap.get(name)
    result.push({
      "AGM Name": name,
      "AGM ZONE": orgInfo.zone || existing?.["AGM ZONE"] || "",
      "Mobile Phone": orgInfo.phone || existing?.["Mobile Phone"] || "",
      "Image URL": orgInfo.localImage || orgInfo.imageUrl || existing?.["Image URL"] || "",
      Remark: existing?.Remark || "Local Data",
      Position: orgInfo.position || "Area General Manager",
      _imageFileId: existing?._imageFileId || "",
      _localImage: orgInfo.localImage || existing?._localImage,
    })
  })

  return result
}

// ========== Load data (Supabase with Local Fallback) ==========
export async function loadAllData() {
  updateState({ loading: true, error: null })

  try {
    const orgData = await storageService.getOrgData()
    const agmData = await storageService.getAgmData()

    if (orgData.length > 0) {
      const freshAgmData = regenerateAgmFromOrg(orgData, agmData)
      updateState({
        orgData: orgData,
        agmData: freshAgmData,
        loading: false,
        error: null
      })
      await storageService.saveAgmData(freshAgmData)
      lazyLoadImages()
    } else {
      updateState({
        loading: false,
        error: "ระบบยังไม่พบข้อมูล (โปรดนำเข้าไฟล์ Excel หรือสร้างข้อมูลใหม่)"
      })
    }
  } catch (err) {
    updateState({
      loading: false,
      error: "เกิดข้อผิดพลาดในการโหลดข้อมูลจาก Cloud"
    })
  }
}

// ========== Lazy image loading from local db ==========
async function lazyLoadImages() {
  const allFileIds: { id: string; type: "org" | "agm"; key: string }[] = []
  const { orgData, agmData, imageCache } = state

  orgData.forEach((r, i) => {
    if (r._imageFileId && !imageCache[r._imageFileId]) {
      allFileIds.push({ id: r._imageFileId, type: "org", key: `org-${i}` })
    }
  })

  agmData.forEach((r) => {
    if (r._imageFileId && !imageCache[r._imageFileId]) {
      allFileIds.push({ id: r._imageFileId, type: "agm", key: `agm-${r["AGM Name"]}` })
    }
  })

  for (let i = 0; i < allFileIds.length; i += 5) {
    const batch = allFileIds.slice(i, i + 5)

    const results = await Promise.allSettled(
      batch.map((item) => storageService.getImageBase64(item.id))
    )

    const newCache = { ...state.imageCache }
    results.forEach((result, idx) => {
      if (result.status === "fulfilled" && result.value) {
        newCache[batch[idx].id] = result.value
      }
    })

    updateState({ imageCache: newCache })
  }
}

export function getImageFromCache(fileId: string): string {
  return state.imageCache[fileId] || ""
}

// ========== CRUD Operations (Supabase) ==========
export async function addRow(row: OrgRecord) {
  await storageService.addOrgRow(row)
  await loadAllData()
}

export async function updateRow(index: number, row: OrgRecord) {
  await storageService.updateOrgRow(index, row)
  await loadAllData()
}

export async function deleteRow(index: number) {
  await storageService.deleteOrgRow(index)
  await loadAllData()
}

export async function saveAgm(row: AgmRecord) {
  await storageService.saveAgmRow(row)
  await loadAllData()
}

export async function deleteAgm(name: string) {
  await storageService.deleteAgmRow(name)
  await loadAllData()
}

export async function reorderRow(oldIndex: number, newIndex: number) {
  await storageService.reorderOrgRows(oldIndex, newIndex)
  await loadAllData()
}

export async function resetData() {
  await storageService.resetAllData()
  await loadAllData()
}

export async function uploadAndSaveImage(
  source: string | File,
  refId: string,
  imageType: "agm" | "store"
): Promise<{ url: string; base64: string }> {
  let base64Data = ""
  let filename = `${imageType}-${refId}-${Date.now()}.jpg`

  if (source instanceof File) {
    const { resizeImage } = await import("./image-utils")
    base64Data = await resizeImage(source, 360, 360, 0.7)
    filename = source.name
  } else {
    base64Data = source
  }

  const result = await storageService.uploadImage(base64Data, filename, refId, imageType)

  if (imageType === "store") {
    const idx = state.orgData.findIndex(r => r["ST ID"] === refId)
    if (idx >= 0) setLocalOrgImage(idx, base64Data)
  } else {
    await setLocalAgmImage(refId, base64Data)
  }

  return { url: base64Data, base64: base64Data }
}

export async function bulkImportOrg(rows: OrgRecord[]) {
  await storageService.saveOrgData(rows as any[])
  await loadAllData()
}

export async function importExcelData(file: File): Promise<number> {
  return loadExcelFromFile(file)
}

export function setLocalOrgImage(index: number, base64: string) {
  const newOrgData = [...state.orgData]
  if (newOrgData[index]) {
    newOrgData[index] = { ...newOrgData[index], _localImage: base64 }
    updateState({ orgData: newOrgData })
  }
}

export async function setLocalAgmImage(name: string, base64: string) {
  const newAgmData = [...state.agmData]
  const idx = newAgmData.findIndex((r) => r["AGM Name"] === name)
  if (idx >= 0) {
    newAgmData[idx] = { ...newAgmData[idx], _localImage: base64 }
  }

  const newOrgData = state.orgData.map(row => {
    if (row["Line Manager name"] === name) {
      return {
        ...row,
        "AGM Image URL": base64
      }
    }
    return row
  })

  updateState({ agmData: newAgmData, orgData: newOrgData })
  await storageService.saveOrgData(newOrgData as any[])
  await storageService.saveAgmData(newAgmData)
}

export async function loadExcelFromFile(file: File) {
  updateState({ loading: true, error: null })

  try {
    const orgResult = await excelService.parseLocalFile(file)
    const uniqueAgms = new Set<string>()
    orgResult.forEach(row => {
      if (row["Line Manager name"]) uniqueAgms.add(row["Line Manager name"])
    })

    const agmData = Array.from(uniqueAgms).map(name => {
      const storeWithAgm = orgResult.find(r => r["Line Manager name"] === name)
      return {
        "AGM Name": name,
        "AGM ZONE": storeWithAgm?.["Region"] || "",
        "AGM Phone": storeWithAgm?.["AGM Mobile"] || "",
        "Mobile Phone": storeWithAgm?.["AGM Mobile"] || "",
        Email: "",
        "Image URL": storeWithAgm?.["AGM Image URL"] || "",
        Remark: "From Excel",
        Position: storeWithAgm?.["LM's Position title"] || "Area General Manager"
      }
    })

    updateState({
      orgData: orgResult,
      agmData: agmData as AgmRecord[],
      loading: false,
      error: null
    })

    await storageService.saveOrgData(orgResult as any[])
    await storageService.saveAgmData(agmData as any[])
    lazyLoadImages()

    return orgResult.length
  } catch (err) {
    updateState({
      loading: false,
      error: err instanceof Error ? err.message : "ไม่สามารถอ่านไฟล์ Excel ได้"
    })
    throw err
  }
}

