import { 
    mcCfLog, 
    McErrorCodes
} from "@mechcloud/shared-js"
import { 
    mcEncrypt,
    mcCfGetFailureResponse, 
    mcCfGetResponse
} from '@mechcloud/shared-cloudflare-js'
 
const logPrefix = 'accounts.js ::'

export async function onRequestPost(context) {
    mcCfLog(logPrefix, `Registering account ..`)
 
    const originalPayload = await context.request.json()
    // mcCfLog(logPrefix, `Original account payload : `, mcGetPrettyPrint(originalPayload))
 
    try {
        const accountData = await context.env.ACCOUNTS.get(originalPayload.id)
      
        if(accountData) {
            return mcCfGetFailureResponse(
                McErrorCodes.DUPLICATE_RECORD, 
                `Account '${originalPayload.id}' already exists.`
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
        
        // return mcCfGetResponse({'msg': 'Account registered successfully.'})

        const inputData = JSON.stringify(originalPayload)
        const encryptedData = await mcEncrypt(inputData, encodedKey)

        await context.env.ACCOUNTS.put(originalPayload.id, encryptedData)

        // console.log('Encrypted data from kv : ' + await context.env.ACCOUNTS.get(originalPayload.id))

        return mcCfGetResponse({'msg': 'Account registered successfully.'})
    } catch (err) {
        mcCfLog(logPrefix, `${err.message}\n${err.stack}`)
        
        return mcCfGetFailureResponse(
            McErrorCodes.UNKNOWN_ERROR, 
            'Unknown error.'
        )
    }
 }