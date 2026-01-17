import { 
    mcCfLog, 
    McErrorCodes, 
    mcGetPrettyPrint 
} from "@mechcloud/shared-js"
import { 
    mcDecrypt,
    mcCfGetFailureResponse, 
    mcCfGetResponse 
} from "@mechcloud/shared-cloudflare-js" 

const MODULE_NAME = 'purgeCache.js'

/**
 * Purge Cloudflare cache for specific files or by URL prefix.
 * 
 * Required Cloudflare API Token Permissions:
 * - Account > Account Settings > Read (to look up account ID by name)
 * - Zone > Zone > Read (to look up zone ID by domain name)
 * - Zone > Cache Purge > Purge
 * 
 * Note: Prefix-based purging requires Cloudflare Enterprise plan.
 * If not on Enterprise, use 'files' array instead.
 */
export async function onRequestPost(context) {
    mcCfLog(`${MODULE_NAME} :: Invoking onRequestPost() ..`)

    const payload = await context.request.json()
    mcCfLog(`${MODULE_NAME} :: Original payload :`, mcGetPrettyPrint(payload))

    try {
        // Build the purge request body
        let purgeBody = {}
        
        if (payload.prefixes && payload.prefixes.length > 0) {
            // Direct prefix-based purge (Enterprise feature)
            // Cloudflare requires prefixes WITHOUT the URI scheme (no https://)
            const cleanPrefixes = payload.prefixes.map(prefix => {
                try {
                    const url = new URL(prefix)
                    // Return hostname + pathname (without scheme)
                    return url.hostname + url.pathname
                } catch (e) {
                    // If not a valid URL, return as-is
                    return prefix
                }
            })
            purgeBody = { prefixes: cleanPrefixes }
            mcCfLog(`${MODULE_NAME} :: Purging by prefixes:`, mcGetPrettyPrint(cleanPrefixes))
        } else if (payload.files && payload.files.length > 0) {
            // File-based purge (works on all plans)
            purgeBody = { files: payload.files }
            mcCfLog(`${MODULE_NAME} :: Purging files:`, mcGetPrettyPrint(payload.files))
        } else {
            return mcCfGetFailureResponse(
                McErrorCodes.INVALID_REQUEST, 
                'Must provide either prefixes or files array'
            )
        }

        // Check if ACCOUNTS KV binding exists
        if (!context.env.ACCOUNTS) {
            mcCfLog(`${MODULE_NAME} :: ACCOUNTS KV binding not configured - skipping cache purge`)
            return mcCfGetResponse({
                status: 200,
                message: 'Cache purge skipped - ACCOUNTS KV not configured',
                skipped: true
            })
        }

        // Get the account key from env (this is the KV key, not the actual CF account ID)
        const accountKey = context.env.OIDC_PROXY_CLOUDFLARE_ACCOUNT_ID
        const accountMetadata = await context.env.ACCOUNTS.get(accountKey)

        if (!accountMetadata) {
            return mcCfGetFailureResponse(
                McErrorCodes.RECORD_NOT_FOUND, 
                `Account '${accountKey}' not found in ACCOUNTS KV.`
            )
        }

        // Decrypt to get the API token
        const encodedKey = context.env.ENCRYPTION_KEY
        const plainData = await mcDecrypt(accountMetadata, encodedKey)
        const hostMetadata = JSON.parse(plainData)
        const apiToken = hostMetadata.auth.token

        // Get domain name and account name from env
        const domainName = context.env.ROOT_DOMAIN
        const accountName = context.env.ACCOUNT_NAME
        
        mcCfLog(`${MODULE_NAME} :: Looking up account ID for: ${accountName}`)

        // Get the Cloudflare account ID
        const accountsResponse = await fetch(
            `https://api.cloudflare.com/client/v4/accounts?name=${encodeURIComponent(accountName)}`,
            {
                headers: {
                    'Authorization': `Bearer ${apiToken}`,
                    'Content-Type': 'application/json'
                }
            }
        )
        const accountsData = await accountsResponse.json()

        if (!accountsData.success || !accountsData.result || accountsData.result.length === 0) {
            mcCfLog(`${MODULE_NAME} :: Account not found: ${accountName}`)
            mcCfLog(`${MODULE_NAME} :: Response:`, mcGetPrettyPrint(accountsData))
            return mcCfGetFailureResponse(
                McErrorCodes.RECORD_NOT_FOUND,
                `Cloudflare account '${accountName}' not found`
            )
        }

        const cfAccountId = accountsData.result[0].id
        mcCfLog(`${MODULE_NAME} :: Found Cloudflare account ID: ${cfAccountId}`)

        // Get the zone ID for the domain
        mcCfLog(`${MODULE_NAME} :: Looking up zone for domain: ${domainName}`)
        
        const zoneResponse = await fetch(
            `https://api.cloudflare.com/client/v4/zones?name=${domainName}&account.id=${cfAccountId}`,
            {
                headers: {
                    'Authorization': `Bearer ${apiToken}`,
                    'Content-Type': 'application/json'
                }
            }
        )
        const zoneData = await zoneResponse.json()

        if (!zoneData.success || !zoneData.result || zoneData.result.length === 0) {
            mcCfLog(`${MODULE_NAME} :: Zone not found for domain: ${domainName}`)
            mcCfLog(`${MODULE_NAME} :: Response:`, mcGetPrettyPrint(zoneData))
            return mcCfGetFailureResponse(
                McErrorCodes.RECORD_NOT_FOUND,
                `Zone not found for domain: ${domainName}`
            )
        }

        const zoneId = zoneData.result[0].id
        mcCfLog(`${MODULE_NAME} :: Found zone ID: ${zoneId}`)

        // Purge cache
        const purgeUrl = `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`
        mcCfLog(`${MODULE_NAME} :: Purge request body:`, mcGetPrettyPrint(purgeBody))

        const purgeResponse = await fetch(
            purgeUrl,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(purgeBody)
            }
        )

        const purgeData = await purgeResponse.json()
        mcCfLog(`${MODULE_NAME} :: Purge response status: ${purgeResponse.status}`)
        mcCfLog(`${MODULE_NAME} :: Purge response:`, mcGetPrettyPrint(purgeData))

        if (!purgeData.success) {
            const errorMsg = purgeData.errors?.[0]?.message || 'Cache purge failed'
            mcCfLog(`${MODULE_NAME} :: Purge failed: ${errorMsg}`)
            
            // Check if it's an Enterprise-only feature error
            if (errorMsg.includes('prefix') || errorMsg.includes('enterprise')) {
                return mcCfGetFailureResponse(
                    McErrorCodes.UNKNOWN_ERROR,
                    'Prefix-based cache purge requires Cloudflare Enterprise plan. Use file-based purge instead.'
                )
            }
            
            return mcCfGetFailureResponse(
                McErrorCodes.UNKNOWN_ERROR,
                errorMsg
            )
        }

        return mcCfGetResponse({
            status: purgeResponse.status,
            success: true,
            data: purgeData
        })

    } catch (err) {
        mcCfLog(`${MODULE_NAME} :: ${err.message}\n${err.stack}`)

        return mcCfGetFailureResponse(
            McErrorCodes.UNKNOWN_ERROR, 
            'Unknown error.'
        )
    }
}