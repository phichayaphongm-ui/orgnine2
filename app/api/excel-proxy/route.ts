import { NextRequest, NextResponse } from "next/server"

/**
 * Server-side proxy for downloading OneDrive Excel files.
 * Handles personal OneDrive accounts migrated to SharePoint Online.
 *
 * The key insight: OneDrive personal accounts migrated to SharePoint 
 * return HTML viewer pages for all download endpoints. The only reliable
 * approach is to use the undocumented embed Excel REST API to get data as JSON.
 *
 * Usage: GET /api/excel-proxy?url=<encoded OneDrive share URL>
 */
export async function GET(request: NextRequest) {
    const shareUrl = request.nextUrl.searchParams.get("url")

    if (!shareUrl) {
        return NextResponse.json({ error: "Missing 'url' parameter" }, { status: 400 })
    }

    try {
        console.log("[Excel Proxy] Starting fetch for:", shareUrl)

        // Step 1: Follow the share link redirect to get the full OneDrive URL  
        const redirectUrl = await getRedirectUrl(shareUrl)
        console.log("[Excel Proxy] Redirect URL:", redirectUrl)

        if (!redirectUrl) {
            return NextResponse.json({ error: "Could not resolve share link redirect." }, { status: 400 })
        }

        // Step 2: Extract the SharePoint personal URL components
        const spoInfo = parseSpoUrl(redirectUrl, shareUrl)
        console.log("[Excel Proxy] SPO info:", JSON.stringify(spoInfo))

        // Step 3: Try to get the data via SharePoint REST API
        const result = await trySharePointDownload(spoInfo, redirectUrl)

        if (result) {
            console.log(`[Excel Proxy] Success! Got ${result.byteLength} bytes.`)
            return new NextResponse(result, {
                status: 200,
                headers: {
                    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    "Content-Disposition": `attachment; filename="data.xlsx"`,
                    "Cache-Control": "no-store",
                },
            })
        }

        console.error("[Excel Proxy] All download attempts failed.")
        return NextResponse.json(
            { error: "ไม่สามารถดาวน์โหลดไฟล์ได้ กรุณาดาวน์โหลดไฟล์ Excel จาก OneDrive แล้วนำเข้าผ่านระบบ (Error 403/Forbidden)" },
            { status: 403 }
        )
    } catch (error) {
        console.error("[Excel Proxy] Error:", error)
        return NextResponse.json(
            { error: `Proxy error: ${error instanceof Error ? error.message : "Unknown error"}` },
            { status: 500 }
        )
    }
}

const BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "*/*",
}

async function getRedirectUrl(shareUrl: string): Promise<string | null> {
    try {
        const response = await fetch(shareUrl.trim(), {
            method: "GET",
            redirect: "manual",
            headers: BROWSER_HEADERS,
        })
        return response.headers.get("location")
    } catch (e) {
        console.error("[Excel Proxy] getRedirectUrl error:", e)
        return null
    }
}

interface SpoInfo {
    resid: string
    authkey: string
    cid: string
    uniqueId: string
    personalUrl: string
    redeem: string
}

function parseSpoUrl(redirectUrl: string, originalUrl: string): SpoInfo {
    const info: SpoInfo = { resid: "", authkey: "", cid: "", uniqueId: "", personalUrl: "", redeem: "" }

    try {
        const url = new URL(redirectUrl)
        info.resid = url.searchParams.get("resid") || ""
        info.redeem = url.searchParams.get("redeem") || ""
        info.authkey = url.searchParams.get("authkey") || ""

        // Extract resid/authkey from URL path if not in params
        const pathParts = url.pathname.split("/")
        if (!info.authkey) {
            const authPart = pathParts.find(p => p.startsWith("IQ") || p.startsWith("AQ") || p.startsWith("EQ"))
            if (authPart) info.authkey = authPart
        }

        // Extract CID from resid (CID!s<GUID>)
        if (info.resid && info.resid.includes("!")) {
            info.cid = info.resid.split("!")[0]
        }

        // Extract unique ID from resid
        if (info.resid.includes("!")) {
            let id = info.resid.split("!")[1]
            if (id.startsWith("s")) id = id.substring(1)
            info.uniqueId = id
        }

        // Build personal URL base (SharePoint style)
        const personalMatch = redirectUrl.match(/personal\/([^\/]+)/i)
        if (personalMatch) {
            const host = url.origin
            info.personalUrl = `${host}/personal/${personalMatch[1]}`
        } else if (info.cid) {
            // Fallback for live.com
            info.personalUrl = `https://onedrive.live.com/personal/${info.cid}`
        }
    } catch (e) {
        console.error("[Excel Proxy] parseSpoUrl error:", e)
    }

    // Fallback extraction from original URL (important for 1drv.ms)
    if (!info.cid) {
        const cidMatch = originalUrl.match(/\/c\/([a-f0-9]+)/i)
        if (cidMatch) info.cid = cidMatch[1]
    }
    if (!info.authkey) {
        // Look for the signature IQ... or EQ... in the original URL
        const authMatch = originalUrl.match(/\/(I[A-Za-z0-9_-]{30,})/i) || originalUrl.match(/\/(E[A-Za-z0-9_-]{30,})/i)
        if (authMatch) info.authkey = authMatch[1]
    }

    return info
}

async function trySharePointDownload(info: SpoInfo, redirectUrl: string): Promise<ArrayBuffer | null> {
    if (!info.resid) return null

    // Pattern 1: Direct OneDrive Consumer Download
    // Pattern 2: API v1.0 Shares API
    // Pattern 3: SharePoint Personal API
    const urls = [
        `https://onedrive.live.com/download?resid=${info.resid}${info.authkey ? `&authkey=${info.authkey}` : ""}`,
        `https://api.onedrive.com/v1.0/shares/u!${Buffer.from(redirectUrl).toString("base64").replace(/\//g, "_").replace(/\+/g, "-").replace(/=+$/g, "")}/root/content`,
        info.cid ? `https://onedrive.live.com/download.aspx?cid=${info.cid}&resid=${info.resid}${info.authkey ? `&authkey=${info.authkey}` : ""}` : "",
        info.personalUrl ? `${info.personalUrl}/_api/v2.0/drives/${info.cid}/items/${info.resid}/content` : "",
    ].filter(Boolean)

    for (const url of urls) {
        console.log("[Excel Proxy] Fetching:", url)
        try {
            const response = await fetch(url, {
                headers: BROWSER_HEADERS,
                redirect: "follow",
                signal: AbortSignal.timeout(15000)
            })

            const contentType = response.headers.get("content-type") || ""
            console.log(`[Excel Proxy] HTTP ${response.status} | Type: ${contentType}`)

            if (response.ok && !contentType.includes("html") && !contentType.includes("json")) {
                const buffer = await response.arrayBuffer()
                if (buffer.byteLength > 1000) return buffer
            }
        } catch (e) {
            console.error("[Excel Proxy] Pattern failed:", e)
        }
    }

    return null
}

/**
 * Try using the Excel Online REST API to get data as JSON directly
 * This uses the undocumented Excel iframe embed API
 */
async function tryExcelRestApi(info: SpoInfo): Promise<any | null> {
    if (!info.personalUrl || !info.uniqueId) return null

    // Excel Online exposes data through the OData REST API when embedded
    // Format: /_layouts/15/Doc.aspx/.../_vti_bin/ExcelRest.aspx/...
    const guid = formatAsGuid(info.uniqueId)

    const urls = [
        // Try the Excel REST API
        `${info.personalUrl}/_vti_bin/ExcelRest.aspx/File(guid'${guid}')/Model/Ranges('Store Mgr!A1%7CIC1000')?$format=json`,
        `${info.personalUrl}/_vti_bin/ExcelRest.aspx/File(guid'${guid}')/Model/Ranges('Sheet1!A1%7CIC1000')?$format=json`,
    ]

    for (const url of urls) {
        console.log("[Excel Proxy] Trying Excel REST:", url)
        try {
            const response = await fetch(url, { headers: BROWSER_HEADERS })
            console.log(`[Excel Proxy] Excel REST -> ${response.status}`)
            if (response.ok) {
                return await response.json()
            }
        } catch (e) {
            console.error("[Excel Proxy] Excel REST error:", e)
        }
    }

    return null
}

function formatAsGuid(hex: string): string {
    if (hex.length !== 32) return hex
    return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}`
}
