import { 
   mcCfLog, 
   mcCfLogError, 
   McErrorCodes 
} from '@mechcloud/shared-js'
import { 
   mcCfGetFailureResponse,
   mcCfGetUnauthorizedResponse,
   mcGetAsyncStore,
   errorHandling,
   validate_token
} from '@mechcloud/shared-cloudflare-js'

// const MODULE_NAME = 'api_middleware.js'
const logPrefix = 'api_middleware.js #'

async function validate_email(context) {
   mcCfLog(logPrefix, `Entering validate_email() =====>`)

   const asyncStore = mcGetAsyncStore()
   
   try {
      const email = asyncStore.email

      mcCfLog(logPrefix, `Email : ` + email)

      if(!context.env.ALLOWED_USERS.split(',').includes(email)) {
         const msg = `User '${email}' is not authorized.`
         
         mcCfLogError(msg)

         return mcCfGetUnauthorizedResponse(msg)
      }

      return await context.next()
   } catch (err) {
      mcCfLog(logPrefix, `_middleware.js : ${err.message}\n${err.stack}`)

      return mcCfGetFailureResponse(
         McErrorCodes.INTERNAL_ERROR, 
         'Internal error occured.',
         500
      )
   } finally {
      mcCfLog(logPrefix, `<===== Leaving validate_email().`)
   }
}

export const onRequest = [errorHandling, validate_token, validate_email]
