import { 
    mcGetPrettyPrint, 
    mcGetQueryParam 
} from "@mechcloud/shared-js"
import { 
    mcGetFailureResponse,
    mcGetResponse
} from '@mechcloud/shared-cloudflare-js'
 
const MODULE_NAME = 'listBucketItems.js'

export async function onRequestGet(context) {
    mcCfLog(`${MODULE_NAME} :: Entering onRequestGet() ..`)
 
    try {
        const bucketName = mcGetQueryParam(context.request.url, 'bucketName')

        const listing = await context.env[bucketName].list()
        const files = []
        listing.objects.forEach(obj => {
            files.push(obj.key)
        })
        mcCfLog(`${MODULE_NAME} :: Bucket items : \n`, mcGetPrettyPrint(files))

        return mcGetResponse({files})
    } catch (err) {
        mcCfLog(`${MODULE_NAME} :: ${err.message}\n${err.stack}`)
        
        return mcGetFailureResponse(McErrorCodes.UNKNOWN_ERROR, 'Unknown error.')
    }
}

