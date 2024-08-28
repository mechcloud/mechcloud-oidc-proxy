import { 
   mcCfLog, 
   McErrorCodes, 
   mcGetPrettyPrint
} from "@mechcloud/shared-js"
import { 
   mcGetResponse, 
   mcGetFailureResponse,
   mcDecrypt,
   mcEncrypt
} from "@mechcloud/shared-cloudflare-js"

const MODULE_NAME = 'hostId.js'

// handler for loading host details
export async function onRequestGet(context) {
   mcCfLog(`${MODULE_NAME} :: Getting host details ..`)

   const hostId = context.params.hostId
   mcCfLog(`${MODULE_NAME} :: Host id : ` + hostId)

   // console.log(context.env)
   
   try {
      const encodedKey = context.env.ENCRYPTION_KEY
      // console.log('Encoded key : ' + encodedKey)
      
      const encrytedData = await context.env.HOSTS.get(hostId)
      if(encrytedData) {
         console.log('Encrypted data from kv : ' + encrytedData)
         
         const plainData = await mcDecrypt(encrytedData, encodedKey)

         return mcGetResponse(JSON.parse(plainData))
      } else {
         return mcGetFailureResponse(
            McErrorCodes.RECORD_NOT_FOUND, 
            `Host '${hostId}' not found.`
         )
      }
   } catch (err) {
      mcCfLog(`${MODULE_NAME} :: ${err.message}\n${err.stack}`)

      return mcGetFailureResponse(
         McErrorCodes.INTERNAL_ERROR, 
         'Internal error.'
      )
   }
}

// handler for updating host details
export async function onRequestPut(context) {
   mcCfLog(`${MODULE_NAME} :: Updating host details ..`)

   const hostId = context.params.hostId
   mcCfLog(`${MODULE_NAME} :: Host id : ` + hostId)

   const originalPayload = await context.request.json()
   mcCfLog(`${MODULE_NAME} :: Original host updates : `, mcGetPrettyPrint(originalPayload))
   
   try {
      const encryptedData = await context.env.HOSTS.get(hostId)
      
      if(encryptedData) {
         originalPayload.id = hostId

         const inputData = JSON.stringify(originalPayload)

         const encodedKey = context.env.ENCRYPTION_KEY
         // console.log('Encoded key : ' + encodedKey)

         const encryptedData = await mcEncrypt(inputData, encodedKey)

         await context.env.HOSTS.put(hostId, encryptedData)

         return mcGetResponse({msg: 'Host details updated successfully.'})
      } else {
         return mcGetFailureResponse(
            McErrorCodes.RECORD_NOT_FOUND, 
            `Host '${hostId}' not found.`
         )
      }
   } catch (err) {
      mcCfLog(`${MODULE_NAME} :: ${err.message}\n${err.stack}`)

      return mcGetFailureResponse(
         McErrorCodes.INTERNAL_ERROR, 
         'Internal error.'
      )
   }
}

// handle for delete host
export async function onRequestDelete(context) {
   mcCfLog(`${MODULE_NAME} :: Deleting host details ..`)

   const hostId = context.params.hostId
   mcCfLog(`${MODULE_NAME} :: Host id : ` + hostId)
   
   try {
      const encryptedData = await context.env.HOSTS.get(hostId)
      
      if(encryptedData) {
         await context.env.HOSTS.delete(hostId)

         return mcGetResponse({ msg: `Host '${hostId}' deleted successfully` })
      } else {
         return mcGetFailureResponse(
            McErrorCodes.RECORD_NOT_FOUND, 
            `Host '${hostId}' not found.`
         )
      }
   } catch (err) {
      mcCfLog(`${MODULE_NAME} :: ${err.message}\n${err.stack}`)
      
      return mcGetFailureResponse(
         McErrorCodes.INTERNAL_ERROR, 
         'Internal error.'
      )
   }
}

