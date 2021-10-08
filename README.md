# Real NFT

Query an API endpoint to see if a given wallet address owns (any one of) a given NFT.

The endpoint is `GET /api/:nftName/:address`

Currently supported NFTs include:

- `bayc` (Bored Ape Yacht Club)
- `loot`
- `mayc` (Mutant Ape Yacht Club)
- `sadgirlsbar`
- `cryptopunks`

For a valid request, the returned JSON data is `{"owns": true|false}`

In the future, maybe we'll write an API endpoint that checks whether a given address owns a _specific_ NFT.
