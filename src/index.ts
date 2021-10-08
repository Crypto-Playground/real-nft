import express from "express";
import { ethers } from "ethers";

const app = express();
const port = 8080;

/** Let's use Cloudflare's authentication-not-required ETH JSON-RPC endpoint. */
const RPC_URL = "https://cloudflare-eth.com/";

/** Base class for all NFC ownership validation implementations. */
abstract class NFCValidator {
  provider: ethers.providers.Provider;

  /** Construct an NFC Validator with a web3 provider instance. */
  constructor() {
    // FUTURE CONSIDER: make `provider` a constructor parameter so you can
    // use this code elsewhere. For now, we hardcode it.
    this.provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  }

  /**
   * Return true if the given address owns *any* token associated with this NFC.
   *
   * For example, ask if Address 0xDEADBEEF owns a Cryptopunk -- any cryptopunk.
   */
  abstract ownsAny(address: string): Promise<boolean>;

  /**
   * Return true if the given address owns a specific token associated with this
   * NFC.
   *
   * For example, ask if Address 0xDEADBEEF owns Cryptopunk #3001.
   */
  abstract ownsToken(address: string, token: string): Promise<boolean>;
}

/** An NFC validator that works with any ERC-721 compliant NFC smart contract. */
class ERC721Validator extends NFCValidator {
  /** The (part of) the ERC-721 interface we care about. */
  ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function ownerOf(uint256 tokenId) external view returns (address)",
  ];

  /** A proxy to the ERC-721 smart contract itself. */
  nftContract: ethers.Contract;

  constructor(nftAddress: string) {
    super();
    this.nftContract = new ethers.Contract(nftAddress, this.ABI, this.provider);
  }

  async ownsAny(address: string): Promise<boolean> {
    // call the ERC-721 balanceOf() method on-chain.
    const balanceOf: ethers.BigNumber = await this.nftContract.balanceOf(
      address
    );
    return ethers.constants.Zero.lt(balanceOf);
  }

  async ownsToken(address: string, token: string): Promise<boolean> {
    // call the ERC-721 ownerOf() method on-chain.
    const ownerOf: string = await this.nftContract.ownerOf(token);
    return ownerOf === address;
  }
}

/** An NFC validator for cryptopunks, which predate the ERC-721 specification. */
class CryptopunksValidator extends NFCValidator {
  ADDRESS = "0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb";

  ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function punkIndexToAddress(uint256) view returns (address)",
  ];

  /** A proxy to the cryptopunks non-erc-721 contract. */
  cryptopunksContract: ethers.Contract;

  constructor() {
    super();
    this.cryptopunksContract = new ethers.Contract(
      this.ADDRESS,
      this.ABI,
      this.provider
    );
  }

  async ownsAny(address: string): Promise<boolean> {
    const balanceOf: ethers.BigNumber =
      await this.cryptopunksContract.balanceOf(address);
    return ethers.constants.Zero.lt(balanceOf);
  }

  async ownsToken(address: string, token: string): Promise<boolean> {
    // call the special-purpose punkIndexToAddress() method on-chain.
    const ownerOf: string = await this.cryptopunksContract.punkIndexToAddress(
      token
    );
    return ownerOf === address;
  }
}

/** A map from NFT identifier to a validator instance capable of validating it. */
const VALIDATORS: Record<string, NFCValidator> = {
  bayc: new ERC721Validator("0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D"),
  loot: new ERC721Validator("0xff9c1b15b16263c61d017ee9f65c50e4ae0113d7"),
  mayc: new ERC721Validator("0x60e4d786628fea6478f785a6d7e704777c86a7c6"),
  sadgirlsbar: new ERC721Validator(
    "0x335eeef8e93a7a757d9e7912044d9cd264e2b2d8"
  ),
  cryptopunks: new CryptopunksValidator(),
};

/** Use EJS. */
app.set("view engine", "ejs");

/** Our homepage. */
app.get("/", (request: express.Request, response: express.Response): void => {
  response.render("index");
});

/** The primary "Do they own any of this NFT's tokens?" API endpoint. */
app.get(
  "/api/:nftName/:address",
  async (
    request: express.Request,
    response: express.Response
  ): Promise<void> => {
    try {
      // ensure params
      const { nftName, address } = request.params;
      if (!nftName || !address) {
        response.status(400).json({ error: "Invalid parameters" });
      }

      // decide which NFT validator instance to use
      const validator: NFCValidator | undefined =
        VALIDATORS[request.params.nftName];
      if (validator === undefined) {
        response.status(400).json({ error: "Unsupported NFT name." });
        return;
      }

      // Invoke the validator
      const owns = await validator.ownsAny(request.params.address);
      response.status(200).json({ owns });
    } catch (error) {
      response.status(500).json({ error });
    }
  }
);

/** The primary "Do they own a specific of this NFT's tokens?" API endpoint. */
app.get(
  "/api/:nftName/:address/:token",
  async (
    request: express.Request,
    response: express.Response
  ): Promise<void> => {
    try {
      // ensure params
      const { nftName, address, token } = request.params;
      if (!nftName || !address || !token) {
        response.status(400).json({ error: "Invalid parameters" });
      }

      // decide which NFT validator instance to use
      const validator: NFCValidator | undefined = VALIDATORS[nftName];
      if (validator === undefined) {
        response.status(400).json({ error: "Unsupported NFT name." });
        return;
      }

      // Invoke the validator
      const owns = await validator.ownsToken(address, token);
      response.status(200).json({ owns });
    } catch (error) {
      response.status(500).json({ error });
    }
  }
);

/** Server runner. */
app.listen(8080, () => {
  console.log("Running the server.");
});
