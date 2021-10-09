# Real NFT

Query an API endpoint to see if a given wallet address owns a given NFT.

The endpoint is `GET /api/:nftName/:address[/:tokenId]`

Currently supported NFTs include:

- `bayc` (Bored Ape Yacht Club)
- `loot`
- `mayc` (Mutant Ape Yacht Club)
- `sadgirlsbar`
- `cryptopunks`

Successful requests return data in the form `{"owns": true|false}`

If no `tokenId` is provided, we answer the question "does `address` own _any_ of the given NFT" ("do you own any cryptopunks?"); if a `tokenId` _is_ provided, we answer whether the `address` owns _that specific_ NFT ("do you own cryptopunk #3100?").

For token-specific requests, if the API is able to, it will also return the `imageURL` of the NFT.
