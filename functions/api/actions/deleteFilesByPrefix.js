import { 
    mcCfLog,
    McErrorCodes,
    mcGetPrettyPrint
} from "@mechcloud/shared-js"
import { 
    mcCfGetResponse,
    mcCfGetFailureResponse
} from '@mechcloud/shared-cloudflare-js'
 
const MODULE_NAME = 'deleteFilesByPrefix.js'

export async function onRequestPost(context) {
    mcCfLog(`${MODULE_NAME} :: Entering onRequestPost() ..`)
 
    try {
        const requestBody = await context.request.json()
        const { bucketName, prefix } = requestBody

        if (!bucketName || !prefix) {
            return mcCfGetFailureResponse(
                McErrorCodes.INVALID_REQUEST, 
                'bucketName and prefix are required'
            )
        }

        mcCfLog(`${MODULE_NAME} :: Deleting files with prefix '${prefix}' from bucket '${bucketName}'`)

        // List all objects with the given prefix
        const listing = await context.env[bucketName].list({ prefix })
        const filesToDelete = listing.objects.map(obj => obj.key)

        mcCfLog(`${MODULE_NAME} :: Found ${filesToDelete.length} files to delete`)
        mcCfLog(`${MODULE_NAME} :: Files: \n`, mcGetPrettyPrint(filesToDelete))

        // Delete all files
        let deletedCount = 0
        for (const key of filesToDelete) {
            await context.env[bucketName].delete(key)
            deletedCount++
        }

        mcCfLog(`${MODULE_NAME} :: Successfully deleted ${deletedCount} files`)

        return mcCfGetResponse({
            msg: `Successfully deleted ${deletedCount} files`,
            deletedCount,
            deletedFiles: filesToDelete
        })
    } catch (err) {
        mcCfLog(`${MODULE_NAME} :: ${err.message}\n${err.stack}`)
        
        return mcCfGetFailureResponse(
            McErrorCodes.UNKNOWN_ERROR, 
            'Unknown error.'
        )
    }
}
