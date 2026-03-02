import type { OrgRecord as OrgRow, AgmRecord as AgmRow } from "./types"
import { supabase } from "./supabase"

const DATABASE_NAME = "OrgChartInternalDB"
const STORE_NAME = "images"
const DB_VERSION = 1

// --- IndexedDB Helper ---
function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DATABASE_NAME, DB_VERSION)
        request.onupgradeneeded = () => {
            const db = request.result
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME)
            }
        }
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
    })
}

async function saveImageToDB(id: string, base64: string): Promise<void> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite")
        const store = transaction.objectStore(STORE_NAME)
        const request = store.put(base64, id)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
    })
}

async function getImageFromDB(id: string): Promise<string | null> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readonly")
        const store = transaction.objectStore(STORE_NAME)
        const request = store.get(id)
        request.onsuccess = () => resolve(request.result || null)
        request.onerror = () => reject(request.error)
    })
}

async function deleteImageFromDB(id: string): Promise<void> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite")
        const store = transaction.objectStore(STORE_NAME)
        const request = store.delete(id)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
    })
}

// --- Storage Keys ---
const ORG_DATA_KEY = "ORG_CHART_ORG_DATA"
const AGM_DATA_KEY = "ORG_CHART_AGM_DATA"

// --- Storage Service ---
export const storageService = {
    // ORG DATA (Local)
    getOrgDataLocal: (): OrgRow[] => {
        if (typeof window === "undefined") return []
        const data = localStorage.getItem(ORG_DATA_KEY)
        return data ? JSON.parse(data) : []
    },

    saveOrgDataLocal: (data: OrgRow[]) => {
        localStorage.setItem(ORG_DATA_KEY, JSON.stringify(data))
    },

    // ORG DATA (Supabase)
    getOrgData: async (): Promise<OrgRow[]> => {
        const { data, error } = await supabase
            .from('org_data')
            .select('*')
            .order('id', { ascending: true })

        if (error) {
            console.error("Error fetching org data from Supabase:", error)
            return storageService.getOrgDataLocal()
        }
        return data as OrgRow[]
    },

    saveOrgData: async (data: OrgRow[]) => {
        // First delete all existing rows and then insert all at once (simple sync)
        // Note: For large datasets, a more granular approach is better
        const { error: deleteError } = await supabase.from('org_data').delete().neq('id', -1)
        if (deleteError) {
            console.error("Error deleting old org data from Supabase:", deleteError)
            return
        }

        const { error: insertError } = await supabase.from('org_data').insert(data)
        if (insertError) {
            console.error("Error inserting org data to Supabase:", insertError)
        }

        // Always save locally as well
        storageService.saveOrgDataLocal(data)
    },

    addOrgRow: async (row: OrgRow) => {
        const data = await storageService.getOrgData()
        data.push(row)
        await storageService.saveOrgData(data)
    },

    updateOrgRow: async (index: number, row: OrgRow) => {
        const data = await storageService.getOrgData()
        if (index >= 0 && index < data.length) {
            data[index] = row
            await storageService.saveOrgData(data)
        }
    },

    deleteOrgRow: async (index: number) => {
        const data = await storageService.getOrgData()
        if (index >= 0 && index < data.length) {
            data.splice(index, 1)
            await storageService.saveOrgData(data)
        }
    },

    reorderOrgRows: async (oldIndex: number, newIndex: number) => {
        const data = await storageService.getOrgData()
        if (oldIndex < 0 || oldIndex >= data.length || newIndex < 0 || newIndex >= data.length) return
        const [movedItem] = data.splice(oldIndex, 1)
        data.splice(newIndex, 0, movedItem)
        await storageService.saveOrgData(data)
    },

    // AGM DATA (Local)
    getAgmDataLocal: (): AgmRow[] => {
        if (typeof window === "undefined") return []
        const data = localStorage.getItem(AGM_DATA_KEY)
        return data ? JSON.parse(data) : []
    },

    saveAgmDataLocal: (data: AgmRow[]) => {
        localStorage.setItem(AGM_DATA_KEY, JSON.stringify(data))
    },

    // AGM DATA (Supabase)
    getAgmData: async (): Promise<AgmRow[]> => {
        const { data, error } = await supabase
            .from('agm_data')
            .select('*')

        if (error) {
            console.error("Error fetching agm data from Supabase:", error)
            return storageService.getAgmDataLocal()
        }
        return data as AgmRow[]
    },

    saveAgmData: async (data: AgmRow[]) => {
        const { error: deleteError } = await supabase.from('agm_data').delete().neq('AGM Name', '')
        if (deleteError) {
            console.error("Error deleting old agm data from Supabase:", deleteError)
            return
        }

        const { error: insertError } = await supabase.from('agm_data').insert(data)
        if (insertError) {
            console.error("Error inserting agm data to Supabase:", insertError)
        }

        // Always save locally as well
        storageService.saveAgmDataLocal(data)
    },

    saveAgmRow: async (row: AgmRow) => {
        const data = await storageService.getAgmData()
        const existingIndex = data.findIndex(r => r["AGM Name"] === row["AGM Name"])
        if (existingIndex >= 0) {
            data[existingIndex] = row
        } else {
            data.push(row)
        }
        await storageService.saveAgmData(data)
    },

    deleteAgmRow: async (agmName: string) => {
        const data = await storageService.getAgmData()
        const newData = data.filter(r => r["AGM Name"] !== agmName)
        await storageService.saveAgmData(newData)
    },

    // SYNC LOCAL TO CLOUD
    syncToCloud: async () => {
        const localOrgData = storageService.getOrgDataLocal()
        const localAgmData = storageService.getAgmDataLocal()

        if (localOrgData.length > 0) {
            await storageService.saveOrgData(localOrgData)
        }
        if (localAgmData.length > 0) {
            await storageService.saveAgmData(localAgmData)
        }

        return { success: true }
    },

    // IMAGE HANDLING (Always Local IndexedDB for now)
    async uploadImage(base64: string, filename: string, refId: string, type: "agm" | "store") {
        const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        await saveImageToDB(imageId, base64)

        const internalUrl = `localdb://${imageId}`

        return {
            success: true,
            url: internalUrl,
            fileId: imageId
        }
    },

    getImageBase64: (fileId: string): Promise<string | null> => {
        return getImageFromDB(fileId)
    },

    resetAllData: async () => {
        localStorage.removeItem(ORG_DATA_KEY)
        localStorage.removeItem(AGM_DATA_KEY)
        await supabase.from('org_data').delete().neq('id', -1)
        await supabase.from('agm_data').delete().neq('AGM Name', '')
    }
}

