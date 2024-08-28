import { 
   mcCfLog, 
   McErrorCodes 
} from '@mechcloud/shared-js'
import { 
   mcGetFailureResponse,
   mcGetResponse,
   mcInvokeProxyGetUserDetails 
} from '@mechcloud/shared-cloudflare-js'

const MODULE_NAME = 'api_middleware.js'

async function validate_token(context) {
   mcCfLog(`${MODULE_NAME} :: Entering validate_token() =====>`)
   
   const start = Date.now()
   
   mcCfLog(`${MODULE_NAME} :: OAuth2 proxy host : ` + context.env.OAUTH2_PROXY_HOST)

   try {
      const email = await mcInvokeProxyGetUserDetails(context)

      mcCfLog(`${MODULE_NAME} :: Email : ` + email)

      if(!context.env.ALLOWED_USERS.split(',').includes(email)) {
         return mcGetResponse(`User '${email}' is not authorized.`, 403)
      }

      return await context.next()
   } catch (err) {
      mcCfLog(`${MODULE_NAME} :: _middleware.js : ${err.message}\n${err.stack}`)

      return mcGetFailureResponse(
         McErrorCodes.INTERNAL_ERROR, 
         'Internal error occured.',
         500
      )
   } finally {
      mcCfLog(`${MODULE_NAME} :: errorHandling() execution time : ${Date.now() - start}ms`)
      mcCfLog(`${MODULE_NAME} :: <===== Leaving validate_token().`)
   }
}

export const onRequest = [validate_token]
