// import { 
//     createHash,
//     randomBytes 
// } from 'node:crypto'

// import DigestClient from "digest-fetch"

import { 
    mcCfLog, 
    McErrorCodes, 
    mcGetPrettyPrint 
} from "@mechcloud/shared-js"
import { 
    mcDecrypt,
    mcGetFailureResponse, 
    mcGetResponse 
} from "@mechcloud/shared-cloudflare-js" 

const MODULE_NAME = 'purgeCache.js'

export async function onRequestPost(context) {
    mcCfLog(`${MODULE_NAME} :: Invoking onRequestPost() ..`)

    const payload = await context.request.json()
    mcCfLog(`${MODULE_NAME} :: Original payload : \n`, mcGetPrettyPrint(payload))

    try {
        // console.log(context)
        let files = []
        if(payload.bucketName && payload.customDomain) {
            const bucketName = payload.bucketName
            const listing = await context.env[bucketName].list()
            listing.objects.forEach(obj => {
                files.push(`https://${payload.customDomain}/${obj.key}`)
            })
        } else {
            files = payload.files
        }
        mcCfLog(`${MODULE_NAME} :: Cache items to delete : \n`, mcGetPrettyPrint(files))

        const hostId = 'cloudflare'
        const hostData = await context.env.HOSTS.get(hostId)

        if(hostData) {
            const encodedKey = context.env.ENCRYPTION_KEY
            // console.log('Encoded key : ' + encodedKey)

            const plainData = await mcDecrypt(hostData, encodedKey)
            const hostMetadata = JSON.parse(plainData)

            let url = `https://api.cloudflare.com/client/v4/zones/${context.env.ZONE_ID}/purge_cache`

            mcCfLog(`${MODULE_NAME} :: Target url : ` + url)

            const headers = {
                Authorization : `Bearer ${hostMetadata.auth.token}`,
                'Content-Type' : 'application/json'
            }

            // mcCfLog(`${MODULE_NAME} :: Headers : \n`, mcGetPrettyPrint(headers))

            const resp = await fetch(
                url, 
                {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({files})
                }
            )

            mcCfLog(`${MODULE_NAME} :: Response code from target url : `, resp.status)
        
            return mcGetResponse(
                {
                    status: resp.status,
                    data: await resp.json()
                }
            )
        } else {
            return mcGetFailureResponse(
                McErrorCodes.RECORD_NOT_FOUND, 
                `Host '${hostId}' not found.`
            )
        }
    } catch (err) {
        mcCfLog(`${MODULE_NAME} :: ${err.message}\n${err.stack}`)

        return mcGetFailureResponse(
            McErrorCodes.UNKNOWN_ERROR, 
            'Unknown error.'
        )
    }
}