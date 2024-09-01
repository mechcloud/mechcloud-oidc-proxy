import { 
    mcCfLog, 
    McErrorCodes
} from '@mechcloud/shared-js'

import { 
    mcCfGetResponse, 
    mcCfGetFailureResponse,
    mcGenerateKey,
 } from "@mechcloud/shared-cloudflare-js"

 const MODULE_NAME = 'generateEncryptionKey.js'

 export async function onRequestGet(context) {
    mcCfLog(`${MODULE_NAME} :: Entering onRequestGet() ..`)

    try {
        const encodedKey = await mcGenerateKey()
        
        return mcCfGetResponse({ key: encodedKey })
    } catch (err) {
        mcCfLog(`${MODULE_NAME} :: ${err.message}\n${err.stack}`)

        return mcCfGetFailureResponse(
            McErrorCodes.UNKNOWN_ERROR, 
            'Unknown error.'
        )
    }
 }