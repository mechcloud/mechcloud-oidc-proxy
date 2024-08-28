# mechcloud-oidc-proxy
This project is a Cloudflare pages functions project which should be deployed in your Cloudflare account. It is used by MechCloud to store the static pages, purge cache and as a universal OIDC proxy to communicate with any third party API without storing any type of short/long term credentials for any such APIs.

This proxy is configured to trust MechCloud IdP (powered by Auth0) by default (See `OAUTH2_PROXY_HOST` variable in `wrangler.toml` file). If you want, you can use your own IdP as well but that is available for paid plans only.

## Cloudflare secrets
This proxy has dependency on the following Cloudflare secrets (encrypted environment variables) -
*  ENCRYPTION_KEY - It can be generated using an endpoint provided by this proxy only. See endpoint section for same.
* ZONE_ID - This is the id assigned by Cloudflare to a domain when you add it to Cloudflare. It can be an existing domain purchased outside Cloudflare or can be bought from Cloudflare.
*  ALLOWED_USERS - Comma seperated list of email ids of users whose are allowed to invoke this proxy from MechCloud. All such users must be registered in MechCloud.

## Deploying this proxy in your Cloudflare account
* Clone this repository.
* Executed following commands from the root folder of this project -
```
cd mechcloud-oidc-proxy

yarn install

yarn build 
```

* Login to your Cloudflare account using wrangler and deploy this project -
```
yarn wrangler login

yarn deploy
```

## Proxy for MechCloud site builder
This proxy is used by MechCloud to store the static version of pages designed through it page builder into a Cloudflare R2 bucket which you will map to a site at the time of creating it in the MechCloud. It is also used to purge the Cloudflare cache as and when the static site content is updated.

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

Assuming the custom domain for above bucket is `site1.example.com`, you will need to configure the `binding` and `custom domain` for the bucket in MechCloud as shown in the below screenshot -



## Universal OIDC proxy for MechCloud
This is also an OIDC proxy which is required by MechCloud to communicate with any third party API without storing long term credentials for all such third party APIs. It currently supports `Bearer` and `Digest` auth types which cover most of the APIs which you can find on the internet. This is to eliminate the possibility of leakage of third party short/long term credentials from our system and to convert our chatbots to universal chatbots so that these can communicate with any thrid party API without storing any short/long term credentials for all such APIs.


