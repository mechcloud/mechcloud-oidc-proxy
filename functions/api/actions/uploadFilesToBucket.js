import { 
    mcCfLog, 
    McErrorCodes,
    mcGetPrettyPrint
} from "@mechcloud/shared-js"
import { 
    mcCfGetResponse,
    mcCfGetFailureResponse
} from '@mechcloud/shared-cloudflare-js'
 
const MODULE_NAME = 'uploadFilesToBucket.js'

/**
 * Upload one or multiple files to R2 bucket.
 * 
 * Request body (JSON):
 * {
 *   "bucketName": "bucket-binding-name",
 *   "files": {
 *     "path/to/file1.yaml": "file content 1",
 *     "path/to/file2.json": "file content 2"
 *   }
 * }
 * 
 * Returns:
 * {
 *   "filesUploaded": 2,
 *   "results": [
 *     { "uri": "path/to/file1.yaml", "action": "created" },
 *     { "uri": "path/to/file2.json", "action": "updated" }
 *   ]
 * }
 */
export async function onRequestPost(context) {
    mcCfLog(`${MODULE_NAME} :: Entering onRequestPost() ..`)
 
    try {
        const payload = await context.request.json()
        mcCfLog(`${MODULE_NAME} :: Payload keys: bucketName=${payload.bucketName}, files count=${Object.keys(payload.files || {}).length}`)

        const { bucketName, files } = payload

        if (!bucketName) {
            return mcCfGetFailureResponse(
                McErrorCodes.GENERIC_ERROR,
                'bucketName is required'
            )
        }

        if (!files || typeof files !== 'object' || Object.keys(files).length === 0) {
            return mcCfGetFailureResponse(
                McErrorCodes.GENERIC_ERROR,
                'files object is required and must not be empty'
            )
        }

        const bucket = context.env[bucketName]
        if (!bucket) {
            return mcCfGetFailureResponse(
                McErrorCodes.GENERIC_ERROR,
                `Bucket binding '${bucketName}' not found`
            )
        }

        const results = []
        const errors = []

        for (const [uri, content] of Object.entries(files)) {
            try {
                // Check if file exists
                const existingObj = await bucket.head(uri)

                // Upload file
                await bucket.put(uri, content, {
                    httpMetadata: {
                        contentType: uri.endsWith('.yaml') || uri.endsWith('.yml')
                            ? 'text/yaml'
                            : uri.endsWith('.json')
                                ? 'application/json'
                                : 'text/plain'
                    }
                })

                results.push({
                    uri,
                    action: existingObj ? 'updated' : 'created'
                })
            } catch (err) {
                mcCfLog(`${MODULE_NAME} :: Error uploading ${uri}: ${err.message}`)
                errors.push({ uri, error: err.message })
            }
        }

        if (errors.length > 0) {
            mcCfLog(`${MODULE_NAME} :: Upload errors: ${mcGetPrettyPrint(errors)}`)
            return mcCfGetFailureResponse(
                McErrorCodes.GENERIC_ERROR,
                `Failed to upload ${errors.length} file(s): ${errors.map(e => e.uri).join(', ')}`
            )
        }

        mcCfLog(`${MODULE_NAME} :: Successfully uploaded ${results.length} file(s)`)

        return mcCfGetResponse({
            filesUploaded: results.length,
            results
        })
    } catch (err) {
        mcCfLog(`${MODULE_NAME} :: ${err.message}\n${err.stack}`)
        
        return mcCfGetFailureResponse(
            McErrorCodes.UNKNOWN_ERROR, 
            'Unknown error.'
        )
    }
}
