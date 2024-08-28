// import { 
//     createHash,
//     randomBytes 
// } from 'node:crypto'

// import DigestClient from "digest-fetch"

import {
    mcDecrypt,
    mcGetFailureResponse,
    mcGetResponse
} from "@mechcloud/shared-cloudflare-js"
import {
    mcCfLog,
    McErrorCodes,
    mcGetPrettyPrint,
    mcGetQueryParam
} from "@mechcloud/shared-js"

const MODULE_NAME = 'invokeEndpoint.js'

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
    mcCfLog(`${MODULE_NAME} :: Invoking endpoint ..`)

    const payload = await context.request.json()
    mcCfLog(`${MODULE_NAME} :: Original payload : \n`, mcGetPrettyPrint(payload))

    try {
        const hostId = mcGetQueryParam(context.request.url, 'hostId')
        const hostData = await context.env.HOSTS.get(hostId)

        if(hostData) {
            const encodedKey = context.env.ENCRYPTION_KEY
            // console.log('Encoded key : ' + encodedKey)

            const plainData = await mcDecrypt(hostData, encodedKey)
            const hostMetadata = JSON.parse(plainData)

            let url = hostMetadata.host + payload.uri

            if(payload.queryParams) {
                const searchParams = new URLSearchParams(params)
                url += `?${searchParams.toString()}`
            }

            mcCfLog(`${MODULE_NAME} :: Target url : ` + url)

            const headers = {
                'Accept': 'application/json'
            }

            if(payload.headers) {
                Object.assign(headers, payload.headers)
            }

            const auth = hostMetadata.auth

            if (auth) {
                if (auth.type === 'bearer') {
                    headers['Authorization'] = `Bearer ${auth.token}`
                } else if (auth.type === 'digest') {
                    // For Digest Auth, we need to make an initial request to get the nonce
                    const resp = await fetch(url, { headers })
                    mcCfLog(`${MODULE_NAME} :: Inital response code from target url : `, resp.status)
                    // mcCfLog(`${MODULE_NAME} :: Headers : `, resp.headers)

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

                        mcCfLog(`${MODULE_NAME} :: 'www-authenticate' headers details : \n`, mcGetPrettyPrint(wwwAuthnHeaderDetails))
            
                        const ha1Text = `${auth.username}:${wwwAuthnHeaderDetails.realm}:${auth.pwd}`
                        // mcCfLog(`${MODULE_NAME} :: ha1 text : `, ha1Text)
                        const ha1 = await digestHash(ha1Text)

                        const ha2Text = `${payload.method}:${new URL(url).pathname}`
                        // mcCfLog(`${MODULE_NAME} :: ha2 text : `, ha2Text)
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
                }
            }

            mcCfLog(`${MODULE_NAME} :: Headers : \n`, mcGetPrettyPrint(headers))

            let data = null

            if(['POST', 'PUT'].includes(payload.method)) {
                headers['Content-Type'] = 'application/json'

                data = JSON.stringify(payload.req)
            }

            const resp1 = await fetch(
                url, 
                {
                    method: payload.method,
                    headers,
                    body: data
                }
            )

            mcCfLog(`${MODULE_NAME} :: Response code from target url : `, resp1.status)
        
            return mcGetResponse(
                {
                    status: resp1.status,
                    data: await resp1.json()
                }
            )
        } else {
            return mcGetFailureResponse(McErrorCodes.RECORD_NOT_FOUND, `Host '${hostId}' not found.`)
        }
    } catch (err) {
        mcCfLog(`${MODULE_NAME} :: ${err.message}\n${err.stack}`)

        return mcGetFailureResponse(McErrorCodes.UNKNOWN_ERROR, 'Unknown error.')
    }
}