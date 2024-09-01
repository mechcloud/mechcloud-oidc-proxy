import { 
    mcCfLog, 
    McErrorCodes, 
    mcGetQueryParam 
} from "@mechcloud/shared-js"
import { 
    mcCfGetResponse,
    mcCfGetFailureResponse
} from '@mechcloud/shared-cloudflare-js'
 
const MODULE_NAME = 'uploadFileToBucket.js'

export async function onRequestPost(context) {
    mcCfLog(`${MODULE_NAME} :: Entering onRequestPost() ..`)
 
    try {
        const fileConent = await context.request.text()
        const bucketName = mcGetQueryParam(context.request.url, 'bucketName')
        const uri = mcGetQueryParam(context.request.url, 'uri')

        const obj = await context.env[bucketName].head(uri);

        await context.env[bucketName].put(uri, atob(fileConent))

        if(obj) {
            return mcCfGetResponse({'action': 'updated'})
        }

        return mcCfGetResponse({'action': 'created'})
    } catch (err) {
        mcCfLog(`${MODULE_NAME} :: ${err.message}\n${err.stack}`)
        
        return mcCfGetFailureResponse(
            McErrorCodes.UNKNOWN_ERROR, 
            'Unknown error.'
        )
    }
}

