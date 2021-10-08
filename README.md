# Real NFT

Query an API endpoint to see if a given wallet address owns a given NFT.

The endpoint is `GET /api/:nftName/:accountId`

Currently supported NFTs include:

- `cryptopunks`
- `bayc` (Bored Ape Yacht Club)
- `loot`
- `mayc` (Mutant Ape Yacht Club)
- `sadgirlsbar`

For a valid request, the returned JSON data is `{"owned": true|false}`
