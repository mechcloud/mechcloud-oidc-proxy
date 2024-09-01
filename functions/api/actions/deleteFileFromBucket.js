import { 
    mcGetQueryParam,
    mcCfLog,
    McErrorCodes
} from "@mechcloud/shared-js"
import { 
    mcCfGetResponse,
    mcCfGetFailureResponse
} from '@mechcloud/shared-cloudflare-js'
 
const MODULE_NAME = 'deleteFileFromBucket.js'

export async function onRequestDelete(context) {
    mcCfLog(`${MODULE_NAME} :: Entering onRequestDelete() ..`)
 
    try {
        const bucketName = mcGetQueryParam(context.request.url, 'bucketName')
        const uri = mcGetQueryParam(context.request.url, 'uri')

        await context.env[bucketName].delete(uri);

        return mcCfGetResponse({'msg': 'Item deleted successfully.'})
    } catch (err) {
        mcCfLog(`${MODULE_NAME} :: ${err.message}\n${err.stack}`)
        
        return mcCfGetFailureResponse(
            McErrorCodes.UNKNOWN_ERROR, 
            'Unknown error.'
        )
    }
}

