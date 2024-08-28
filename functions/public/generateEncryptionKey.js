import { 
    mcCfLog 
} from '@mechcloud/shared-js'

import { 
    mcGetResponse, 
    mcGetFailureResponse,
    mcGenerateKey,
 } from "@mechcloud/shared-cloudflare-js"

 const MODULE_NAME = 'generateEncryptionKey.js'

 export async function onRequestGet(context) {
    mcCfLog(`${MODULE_NAME} :: Entering onRequestGet() ..`)

    try {
        const encodedKey = await mcGenerateKey()
        
        return mcGetResponse({ key: encodedKey })
    } catch (err) {
        mcCfLog(`${MODULE_NAME} :: ${err.message}\n${err.stack}`)

        return mcGetFailureResponse(McErrorCodes.UNKNOWN_ERROR, 'Unknown error.')
    }
 }