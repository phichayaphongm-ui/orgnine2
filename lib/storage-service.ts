import type { OrgRecord as OrgRow, AgmRecord as AgmRow } from "./types"

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
    // ORG DATA
    getOrgData: (): OrgRow[] => {
        if (typeof window === "undefined") return []
        const data = localStorage.getItem(ORG_DATA_KEY)
        return data ? JSON.parse(data) : []
    },

    saveOrgData: (data: OrgRow[]) => {
        localStorage.setItem(ORG_DATA_KEY, JSON.stringify(data))
    },

    addOrgRow: (row: OrgRow) => {
        const data = storageService.getOrgData()
        data.push(row)
        storageService.saveOrgData(data)
    },

    updateOrgRow: (index: number, row: OrgRow) => {
        const data = storageService.getOrgData()
        if (index >= 0 && index < data.length) {
            data[index] = row
            storageService.saveOrgData(data)
        }
    },

    deleteOrgRow: (index: number) => {
        const data = storageService.getOrgData()
        if (index >= 0 && index < data.length) {
            data.splice(index, 1)
            storageService.saveOrgData(data)
        }
    },

    reorderOrgRows: (oldIndex: number, newIndex: number) => {
        const data = storageService.getOrgData()
        if (oldIndex < 0 || oldIndex >= data.length || newIndex < 0 || newIndex >= data.length) return
        const [movedItem] = data.splice(oldIndex, 1)
        data.splice(newIndex, 0, movedItem)
        storageService.saveOrgData(data)
    },

    // AGM DATA
    getAgmData: (): AgmRow[] => {
        if (typeof window === "undefined") return []
        const data = localStorage.getItem(AGM_DATA_KEY)
        return data ? JSON.parse(data) : []
    },

    saveAgmData: (data: AgmRow[]) => {
        localStorage.setItem(AGM_DATA_KEY, JSON.stringify(data))
    },

    saveAgmRow: (row: AgmRow) => {
        const data = storageService.getAgmData()
        const existingIndex = data.findIndex(r => r["AGM Name"] === row["AGM Name"])
        if (existingIndex >= 0) {
            data[existingIndex] = row
        } else {
            data.push(row)
        }
        storageService.saveAgmData(data)
    },

    deleteAgmRow: (agmName: string) => {
        const data = storageService.getAgmData()
        const newData = data.filter(r => r["AGM Name"] !== agmName)
        storageService.saveAgmData(newData)
    },

    // IMAGE HANDLING
    async uploadImage(base64: string, filename: string, refId: string, type: "agm" | "store") {
        const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        await saveImageToDB(imageId, base64)

        // We return a "pseudo-URL" that identifies it's stored in IndexedDB
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

    resetAllData: () => {
        localStorage.removeItem(ORG_DATA_KEY)
        localStorage.removeItem(AGM_DATA_KEY)
        // Note: IndexedDB images are kept for now to avoid breaking references
        // but can be added here if needed.
    }
}
