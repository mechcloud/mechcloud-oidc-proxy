// import { 
//     createHash,
//     randomBytes 
// } from 'node:crypto'

// import DigestClient from "digest-fetch"

import {
    mcDecrypt,
    mcCfGetFailureResponse,
    mcCfGetResponse
} from "@mechcloud/shared-cloudflare-js"
import {
    mcCfLog,
    McErrorCodes,
    mcGetPrettyPrint,
    mcGetQueryParam
} from "@mechcloud/shared-js"

const logPrefix = 'invokeEndpoint.js ::'

async function digestHash(data) {
    const encoder = new TextEncoder()
    const buffer = encoder.encode(data)
    const hashBuffer = await crypto.subtle.digest('MD5', buffer)
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
}
  
async function generateCnonce() {
    return Math.random().toString(36).substring(2, 10)
}

// function generateDigestAuth(username, realm, password, method, uri, nonce, cnonce, nc, qop) {
//     console.log(username, password, method, uri, nonce, cnonce, nc, qop)

//     const ha1 = createHash('md5').update(`${username}:${realm}:${password}`).digest('hex')
//     const ha2 = createHash('md5').update(`${method}:${uri}`).digest('hex')
//     const response = createHash('md5').update(`${ha1}:${nonce}:${ha2}`).digest('hex')
//     return response;
// }

export async function onRequestPost(context) {
    mcCfLog(logPrefix, `Invoking endpoint ..`)

    const payload = await context.request.json()
    mcCfLog(logPrefix, `Original payload : \n`, mcGetPrettyPrint(payload))

    try {
        const accountId = mcGetQueryParam(context.request.url, 'accountId')
        let accountMetadata = await context.env.ACCOUNTS.get(accountId)

        if(accountMetadata) {
            const encodedKey = context.env.ENCRYPTION_KEY
            // console.log('Encoded key : ' + encodedKey)

            const plainData = await mcDecrypt(accountMetadata, encodedKey)
            accountMetadata = JSON.parse(plainData)

            let url = payload.baseUrl + payload.uri

            if(payload.queryParams) {
                const searchParams = new URLSearchParams(payload.queryParams)
                url += `?${searchParams.toString()}`
            }

            mcCfLog(logPrefix, `Target url : ` + url)

            const headers = {
                'Accept': 'application/json'
            }

            if(accountMetadata.headers) {
                Object.assign(headers, accountMetadata.headers)
            }

            if(payload.headers) {
                Object.assign(headers, payload.headers)
            }

            const auth = accountMetadata.auth   

            if (auth) {
                if (auth.type === 'bearer') {
                    headers['Authorization'] = `Bearer ${auth.token}`
                } else if (auth.type === 'digest') {
                    // For Digest Auth, we need to make an initial request to get the nonce
                    const resp = await fetch(url, { headers })
                    mcCfLog(logPrefix, `Inital response code from target url : `, resp.status)
                    // mcCfLog(logPrefix, `Headers : `, resp.headers)

                    if (resp.status === 401 && resp.headers.has('www-authenticate')) {
                        const wwwAuthnHeaderDetails = resp.headers.get('www-authenticate').substring(7).split(',').reduce(
                                                (acc, part) => {
                                                    const [key, value] = part.split('=')
                                                    acc[key.trim()] = value.replace(/"/g, '').trim()
                                                    return acc;
                                                }, 
                                                {}
                                            )
                        // wwwAuthnHeaderDetails.realm = wwwAuthnHeaderDetails['Digest realm']

                        mcCfLog(logPrefix, `'www-authenticate' headers details : \n`, mcGetPrettyPrint(wwwAuthnHeaderDetails))
            
                        const ha1Text = `${auth.username}:${wwwAuthnHeaderDetails.realm}:${auth.pwd}`
                        // mcCfLog(logPrefix, `ha1 text : `, ha1Text)
                        const ha1 = await digestHash(ha1Text)

                        const ha2Text = `${payload.method}:${new URL(url).pathname}`
                        // mcCfLog(logPrefix, `ha2 text : `, ha2Text)
                        const ha2 = await digestHash(ha2Text)

                        const nonceCount = '00000001';
                        const cnonce = await generateCnonce()
                        const responseHash = await digestHash(`${ha1}:${wwwAuthnHeaderDetails.nonce}:${nonceCount}:${cnonce}:${wwwAuthnHeaderDetails.qop}:${ha2}`)
            
                        const headerParts = [
                            `username="${auth.username}"`,
                            `realm="${wwwAuthnHeaderDetails.realm}"`,
                            `nonce="${wwwAuthnHeaderDetails.nonce}"`,
                            `uri="${new URL(url).pathname}"`,
                            `qop=${wwwAuthnHeaderDetails.qop}`,
                            `nc=${nonceCount}`,
                            `cnonce="${cnonce}"`,
                            `response="${responseHash}"`,
                            `algorithm="${wwwAuthnHeaderDetails.algorithm || 'MD5'}"`
                        ]
            
                        headers['Authorization'] = `Digest ${headerParts.join(', ')}`
                    }
                } else if (auth.type === 'oauth2') {
                    const tokenEndpoint = auth.tokenEndpoint
                    const clientId = auth.clientId
                    const clientSecret = auth.clientSecret
                    const scopes = auth.scopes ? auth.scopes : []   
    
                    const headers = {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
    
                    const body = new URLSearchParams({
                        'grant_type': 'client_credentials',
                        'client_id': clientId,
                        'client_secret': clientSecret,
                        'scope': scopes.join(' ')
                    })
    
                    const tokenResp = await fetch(tokenEndpoint, {
                        method: 'POST',
                        headers,
                        body
                    })
    
                    if (tokenResp.status === 200) {
                        const tokenRespJson = await tokenResp.json()
                        headers['Authorization'] = `Bearer ${tokenRespJson.access_token}`
                    } else {
                        return mcCfGetFailureResponse(McErrorCodes.AUTH_FAILURE, `Failed to get oauth2 token. Status code : ${tokenResp.status}`)
                    }
                } else if (auth.type === 'oauth2-mongo') {
                    const tokenEndpoint = auth.tokenEndpoint
                    const clientId = auth.clientId
                    const clientSecret = auth.clientSecret
    
                    const headers1 = {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`) 
                    }
    
                    const body = new URLSearchParams({
                        'grant_type': 'client_credentials',
                    })
    
                    const tokenResp = await fetch(tokenEndpoint, {
                        method: 'POST',
                        headers: headers1,
                        body
                    })
    
                    if (tokenResp.status === 200) {
                        const tokenRespJson = await tokenResp.json()
                        headers['Authorization'] = `Bearer ${tokenRespJson.access_token}`
                    } else {
                        return mcCfGetFailureResponse(McErrorCodes.AUTH_FAILURE, `Failed to get oauth2 token. Status code : ${tokenResp.status}`)
                    }
                }
            } 

            // mcCfLog(logPrefix, `Headers : \n`, mcGetPrettyPrint(headers))

            let data = null

            if(['POST', 'PUT'].includes(payload.method)) {
                headers['Content-Type'] = 'application/json'

                data = JSON.stringify(payload.body)
                
                mcCfLog(logPrefix, `External API Request : \n`, mcGetPrettyPrint(data))
            }

            const resp1 = await fetch(
                url, 
                {
                    method: payload.method,
                    headers,
                    body: data
                }
            )

            mcCfLog(logPrefix, `Response code from target url : `, resp1.status)
        
            return mcCfGetResponse(
                {
                    status: resp1.status,
                    data: await resp1.json()
                }
            )
        } else {
            return mcCfGetFailureResponse(McErrorCodes.RECORD_NOT_FOUND, `Account '${accountId}' not found.`)
        }
    } catch (err) {
        mcCfLog(logPrefix, `${err.message}\n${err.stack}`)

        return mcCfGetFailureResponse(McErrorCodes.UNKNOWN_ERROR, 'Unknown error.')
    }
}