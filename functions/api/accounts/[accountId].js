import { 
   mcCfLog, 
   McErrorCodes, 
   mcGetPrettyPrint
} from "@mechcloud/shared-js"
import { 
   mcCfGetResponse, 
   mcCfGetFailureResponse,
   mcDecrypt,
   mcEncrypt
} from "@mechcloud/shared-cloudflare-js"

const logPrefix = 'accountId.js :: '

// handler for loading account details
export async function onRequestGet(context) {
   mcCfLog(logPrefix, `Getting account details ..`)

   const accountId = context.params.accountId
   mcCfLog(logPrefix, `Account id : ` + accountId)

   // mcCfLog(context.env)
   
   try {
      const encodedKey = context.env.ENCRYPTION_KEY
      // mcCfLog('Encoded key : ' + encodedKey)
      
      const encrytedData = await context.env.ACCOUNTS.get(accountId)
      if(encrytedData) {
         mcCfLog('Encrypted data from kv : ' + encrytedData)
         
         const plainData = await mcDecrypt(encrytedData, encodedKey)

         return mcCfGetResponse(JSON.parse(plainData))
      } else {
         return mcCfGetFailureResponse(
            McErrorCodes.RECORD_NOT_FOUND, 
            `Account '${accountId}' not found.`
         )
      }
   } catch (err) {
      mcCfLog(logPrefix, `${err.message}\n${err.stack}`)

      return mcCfGetFailureResponse(
         McErrorCodes.INTERNAL_ERROR, 
         'Internal error.'
      )
   }
}

// handler for updating account details
export async function onRequestPut(context) {
   mcCfLog(logPrefix, `Updating account details ..`)

   const accountId = context.params.accountId
   mcCfLog(logPrefix, `Account id : ` + accountId)

   const originalPayload = await context.request.json()
   mcCfLog(logPrefix, `Original account updates : `, mcGetPrettyPrint(originalPayload))
   
   try {
      const encryptedData = await context.env.ACCOUNTS.get(accountId)
      
      if(encryptedData) {
         originalPayload.id = accountId

         const inputData = JSON.stringify(originalPayload)

         const encodedKey = context.env.ENCRYPTION_KEY
         // mcCfLog('Encoded key : ' + encodedKey)

         const encryptedData = await mcEncrypt(inputData, encodedKey)

         await context.env.ACCOUNTS.put(accountId, encryptedData)

         return mcCfGetResponse({msg: 'Account details updated successfully.'})
      } else {
         return mcCfGetFailureResponse(
            McErrorCodes.RECORD_NOT_FOUND, 
            `Account '${accountId}' not found.`
         )
      }
   } catch (err) {
      mcCfLog(logPrefix, `${err.message}\n${err.stack}`)

      return mcCfGetFailureResponse(
         McErrorCodes.INTERNAL_ERROR, 
         'Internal error.'
      )
   }
}

// handle for delete account
export async function onRequestDelete(context) {
   mcCfLog(logPrefix, `Deleting account details ..`)

   const accountId = context.params.accountId
   mcCfLog(logPrefix, `Account id : ` + accountId)
   
   try {
      const encryptedData = await context.env.ACCOUNTS.get(accountId)
      
      if(encryptedData) {
         await context.env.ACCOUNTS.delete(accountId)

         return mcCfGetResponse({ msg: `Account '${accountId}' deleted successfully` })
      } else {
         return mcCfGetFailureResponse(
            McErrorCodes.RECORD_NOT_FOUND, 
            `Account '${accountId}' not found.`
         )
      }
   } catch (err) {
      mcCfLog(logPrefix, `${err.message}\n${err.stack}`)
      
      return mcCfGetFailureResponse(
         McErrorCodes.INTERNAL_ERROR, 
         'Internal error.'
      )
   }
}

