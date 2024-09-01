import { 
    mcCfLog, 
    McErrorCodes
} from "@mechcloud/shared-js"
import { 
    mcEncrypt,
    mcCfGetFailureResponse, 
    mcCfGetResponse
} from '@mechcloud/shared-cloudflare-js'
 
const MODULE_NAME = 'hosts.js'

export async function onRequestPost(context) {
    mcCfLog(`${MODULE_NAME} :: Registering host ..`)
 
    const originalPayload = await context.request.json()
    // mcCfLog(`${MODULE_NAME} :: Original host payload : `, mcGetPrettyPrint(originalPayload))
 
    try {
        const hostData = await context.env.HOSTS.get(originalPayload.id)
      
        if(hostData) {
            return mcCfGetFailureResponse(
                McErrorCodes.DUPLICATE_RECORD, 
                `Host '${originalPayload.id}' already exists.`
            )
        }
        // const encodedKey = await mcGenerateKey()
        
        // return mcCfGetResponse({'encodedKey': encodedKey})

        const encodedKey = context.env.ENCRYPTION_KEY
        // console.log('Encoded key : ' + encodedKey)

        // const inputData = 'Some data'
        // console.log('Input data : ' + inputData)
        
        // const encryptedData = await mcEncrypt(inputData, encodedKey)
        // console.log('Encrypted data : ' + encryptedData)

        // const decryptedData = await mcDecrypt(encryptedData, encodedKey)
        // console.log('Decrypted data : ' + decryptedData)
        
        // return mcCfGetResponse({'msg': 'Host registered successfully.'})

        const inputData = JSON.stringify(originalPayload)
        const encryptedData = await mcEncrypt(inputData, encodedKey)

        await context.env.HOSTS.put(originalPayload.id, encryptedData)

        // console.log('Encrypted data from kv : ' + await context.env.hosts.get(originalPayload.id))

        return mcCfGetResponse({'msg': 'Host registered successfully.'})
    } catch (err) {
        mcCfLog(`${MODULE_NAME} :: ${err.message}\n${err.stack}`)
        
        return mcCfGetFailureResponse(
            McErrorCodes.UNKNOWN_ERROR, 
            'Unknown error.'
        )
    }
 }