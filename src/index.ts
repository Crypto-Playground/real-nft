import express from "express";
import { ethers } from "ethers";

const app = express();
const port = 8080;

/** Base class for all NFC ownership validation implementations. */
abstract class NFCValidator {
  provider: ethers.providers.Provider;

  /** Construct an NFC Validator with a web3 provider instance. */
  constructor(provider: ethers.providers.Provider) {
    this.provider = provider;
  }

  /**
   * Return true if the given address owns a token associated with this NFC.
   *
   * For example, ask if Address 0xDEADBEEF owns a Cryptopunk.
   *
   * (TODO FUTURE: validate that the given address owns a *specific* token
   * associated with this NFC. For example, ask if 0xDEADBEEF owns Cryptopunk
   * #3001.)
   */
  abstract owns(address: string): Promise<boolean>;
}

/** An NFC validator that works with any ERC-721 compliant NFC smart contract. */
class ERC721Validator extends NFCValidator {
  /** The (part of) the ERC-721 interface we care about. */
  ABI = ["function balanceOf(address owner) view returns (uint256)"];

  /** A proxy to the ERC-721 smart contract itself. */
  nftContract: ethers.Contract;

  constructor(provider: ethers.providers.Provider, nftAddress: string) {
    super(provider);
    this.nftContract = new ethers.Contract(nftAddress, this.ABI, provider);
  }

  async owns(address: string): Promise<boolean> {
    // call the ERC-721 balanceOf() method on-chain.
    const balanceOf: ethers.BigNumber = await this.nftContract.balanceOf(
      address
    );
    return ethers.constants.Zero.lt(balanceOf);
  }
}

/**
 * An NFC validator for cryptopunks, which predate the ERC-721 contract.
 *
 * That said, it happens that the *one* method we want to invoke on the
 * cryptopunks contract *is* ERC-721 compliant, so we'll derive from the
 * ERC721Validator for now, until we want to do something fancier.
 */
class CryptopunksValidator extends ERC721Validator {
  constructor(provider: ethers.providers.Provider) {
    super(provider, "0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb");
  }
}

/** Let's use Cloudflare's authentication-not-required ETH JSON-RPC endpoint. */
const RPC_URL = "https://cloudflare-eth.com/";

/** Global web3 provider instance. */
const PROVIDER = new ethers.providers.JsonRpcProvider(RPC_URL);

/** A map from NFT identifier to a validator instance capable of validating it. */
const VALIDATORS: Record<string, NFCValidator> = {
  bayc: new ERC721Validator(
    PROVIDER,
    "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D"
  ),
  loot: new ERC721Validator(
    PROVIDER,
    "0xff9c1b15b16263c61d017ee9f65c50e4ae0113d7"
  ),
  mayc: new ERC721Validator(
    PROVIDER,
    "0x60e4d786628fea6478f785a6d7e704777c86a7c6"
  ),
  sadgirlsbar: new ERC721Validator(
    PROVIDER,
    "0x335eeef8e93a7a757d9e7912044d9cd264e2b2d8"
  ),
  cryptopunks: new CryptopunksValidator(PROVIDER),
};

/** Use EJS. */
app.set("view engine", "ejs");

/** Our homepage. */
app.get("/", (request: express.Request, response: express.Response): void => {
  response.render("index");
});

/** The primary API endpoint. */
app.get(
  "/api/:nftName/:address",
  async (
    request: express.Request,
    response: express.Response
  ): Promise<void> => {
    try {
      // decide which NFT validator instance to use
      const validator: NFCValidator | undefined =
        VALIDATORS[request.params.nftName];
      if (validator === undefined) {
        response.status(400).json({ error: "Unsupported NFT name." });
        return;
      }

      // Invoke the validator
      const owns = await validator.owns(request.params.address);
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
