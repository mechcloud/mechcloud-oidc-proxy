# mechcloud-oidc-proxy
This project is a `Cloudflare Pages Functions` project which should be deployed in your Cloudflare account. It is used by MechCloud to publish the static version of a site, purging Cloudflare cache and as a universal OpenID Connect (OIDC) proxy to communicate with any third party API without storing any type of short/long term credentials for such APIs.

This proxy is configured to trust MechCloud IdP (powered by `Auth0`) by default (See `OAUTH2_PROXY_HOST` variable in `wrangler.toml` file). However, if you want you can use your own IdP as well with this proxy but that is available for paid plans only.

## Cloudflare secrets required for this proxy
This proxy has dependency on the following Cloudflare secrets (encrypted environment variables) -
* ENCRYPTION_KEY - It can be generated using an [endpoint](#generating-encryption-key) provided by this proxy only.
* DOMAIN_NAME - Root domain (e.g. `mechcloud.lab`) whose subdomains will be mapped to the Cloudflare R2 buckets.
* ALLOWED_USERS - Comma seperated list of email ids of users whose are allowed to invoke this proxy from MechCloud. All such users must be registered in MechCloud.

## Deploying this proxy in your Cloudflare account
* Clone this repository.
* Executed following commands from the root folder of this project -
```
cd mechcloud-oidc-proxy

pnpm install 
```

* Login to your Cloudflare account using wrangler and deploy this project -
```
cd mechcloud-oidc-proxy

pnpm wrangler login

pnpm deploy1
```

* Create `ACCOUNTS` kv namespace in your Cloudflare account -
```
cd mechcloud-oidc-proxy

pnpm wrangler kv:namespace create ACCOUNTS
```

For rest of the instructions, we will assume that this proxy is configured with `oidc-proxy.mechcloud.lab` custom domain in Cloudflare. Update this to whatever custom domain you selected for this proxy after deploying it.

## Cloudflare API token for managing the cache for your static website
In order to make sure that cache is invalidated for the pages, which will be updated through MechCloud page designer, you will need to generate an api token in Cloudflare and configure it in this proxy. 

### Steps for generating a Cloudflare API token
* Login to your cloudflare account.
* Navigate to `My Profile` section by clicking on human icon in the upper right corner.
* Click on `API Tokens`.
* Click on `Create Token` button under `API Tokens` section.
* Enter a name for your API token and make sure it is having permissions as shown below -

![image](https://github.com/user-attachments/assets/15f4b9f3-ee92-4030-9df5-992b032cdb9f)

### Add an account in the proxy for your Cloudflare API token
* Use a tool of your choice to execute following command either from cli or from a UI with equivalent instructions -
```
curl --location 'https://oidc-proxy.mechcloud.lab/api/accounts' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer <mechcloud_jwt_token>' \
--data '{
    "id": "cloudflare_account1",
    "auth": {
        "type": "bearer",
        "token": "<cloudflare_api_token>"
    }
}'
```

You can get `mechcloud_jwt_token` for the above command by logging into `MechCloud` and then entering `https://portal.mechcloud.io/oauth2/auth1` url in your browser. <cloudflare_api_token> is the API Token which you had generated in the previous step.

## Configuring proxy in MechCloud
This proxy can be configured only at the team level in MechCloud at this moment. You will need to add/update this information while creating/updating a team -

![image](https://github.com/user-attachments/assets/66115475-36c9-4ad4-820a-1f02362e4ac9)

## Proxy for MechCloud site builder
This proxy is used by MechCloud to store the static version of pages designed through its page builder into a Cloudflare R2 bucket which you will need to map to a MechCloud site at the time of creating it in the MechCloud. It is also used to purge the Cloudflare cache as and when the static site content is updated.

### Publishing a static site to a R2 bucket
Before MechCloud can publish a page of a static site to a target Cloudflare R2 bucket, you must create a R2 bucket in Cloudflare, add a custom domain (e.g. `site1.example.com`) for the bucket and then configure a mapping for that bucket in wrangler.toml file of this project as shown below -

```
[[r2_buckets]]
binding = "SITE1"
bucket_name = "site1-bucket-1234"

[[r2_buckets]]
binding = "SITE2"
bucket_name = "site2-bucket-5678"
```

* Value of binding and bucket_name need NOT to be same and only value of `binding` attribute in the above configuration is used while configuring a site in MechCloud. You can choose any complex name for your bucket as far as it is supported by Cloudflare.

Assuming the custom domain for above bucket is `site1.example.com`, you will need to configure the `binding` and `custom domain` for the bucket in MechCloud at the site level as shown in the below screenshot -

![image](https://github.com/user-attachments/assets/e7a13cc3-8526-41ac-ad50-d5904d5d0bb7)

## Universal OIDC proxy for MechCloud
This is also an OIDC proxy which is required by MechCloud to communicate with any third party API without storing long term credentials for all such third party APIs. It currently supports `Bearer`, `Digest` and `OAuth2` auth types which cover most of the APIs which you can find on the internet. This is to eliminate the possibility of leakage of third party short/long term credentials from our system and to convert our chatbots to universal chatbots so that these can communicate with any thrid party API without storing any short/long term credentials for all such APIs.


![image](https://github.com/user-attachments/assets/a18b8fdf-135d-460d-ada9-04ab404b13f1)


## Endpoints 
### Public 
#### Generating encryption key
```
curl --location 'https://oidc-proxy.mechcloud.lab/public/generateEncryptionKey'
```

### Protected
All the below endpoints can be invoked by passing a header named `Authorization` with `Bearer <mechcloud_jwt_token>` value. You can get `mechcloud_jwt_token` for the above command by logging into `MechCloud` and then entering `https://portal.mechcloud.io/oauth2/auth1` url in your browser.

#### Register an account

**OAuth 2.0 auth (Client credentials flow)**
```
curl --location 'https://oidc-proxy.mechcloud.lab/api/accounts' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer <mechcloud_jwt_token>' \
--data '{
    "id": "account1",
    "auth": {
        "type": "oauth2",
        "tokenEndpoint": "<token_endpoint_url>",
        "clientId": "<client_id>",
        "clientSecret": "<client_secret>"
    }
}'
```

**OAuth 2.0 auth (Client credentials flow) - MongoDB**
```
curl --location 'https://oidc-proxy.mechcloud.lab/api/accounts' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer <mechcloud_jwt_token>' \
--data '{
    "id": "mongodb_account1",
    "auth": {
        "type": "oauth2-mongo",
        "tokenEndpoint": "https://cloud.mongodb.com/api/oauth/token",
        "clientId": "<mongo_service_account_client_id>",
        "clientSecret": "<mongo_service_account_client_secret>"
    },
    "headers": {
        "Accept": "application/vnd.atlas.2024-10-23+json"
    }
}'
```

**Digest auth**
```
curl --location 'https://oidc-proxy.mechcloud.lab/api/accounts' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer <mechcloud_jwt_token>' \
--data '{
    "id": "mongodb_account2",
    "auth": {
        "type": "digest",
        "username": "<mongo_username>",
        "pwd": "<mongo_pwd>"
    }
}'
```

**Bearer token auth**
```
curl --location 'https://oidc-proxy.mechcloud.lab/api/accounts' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer <mechcloud_jwt_token>' \
--data '{
    "id": "cloudflare_account1",
    "auth": {
        "type": "bearer",
        "token": "<cloudflare_api_token>"
    }
}'
```

#### Get account details 

**(This is just to validate that the information was stored correctly using `Register an account` endpoint and never invoked by MechCloud. Still it is hightly recommended to put an extra check (e.g. an api key) in the code so that this endpoint can't be invoked with MechCloud jwt token only)**

```
curl --location 'https://oidc-proxy.mechcloud.lab/api/accounts/cloudflare_account1' \
--header 'Authorization: Bearer <mechcloud_jwt_token>'
```

#### Update account details

```
curl --location --request PUT 'https://oidc-proxy.mechcloud.dev/api/accounts/cloudflare_account1' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer <mechcloud_jwt_token>' \
--data '{
    "auth": {
        "type": "bearer",
        "token": "<cloudflare_api_token>"
    }
}'
```

#### Deleting account

```
curl --location --request DELETE 'https://oidc-proxy.mechcloud.lab/api/accounts/cloudflare_account1' \
--header 'Authorization: Bearer <mechcloud_jwt_token>'
```

