import { ethers } from "ethers";
import { Beanstalk__factory, Fertilizer__factory } from "./generated";

///////////////////////////////// Constants /////////////////////////////////

const chainId = process.env.CHAIN_ID;
const rpc = process.env.RPC_URL;

if (!chainId) throw new Error('Missing env var: CHAIN_ID')
if (!rpc) throw new Error('Missing env var: RPC_URL')

///////////////////////////////// Contracts /////////////////////////////////

const provider = new ethers.providers.JsonRpcProvider(
  rpc,
  { name: 'Unknown', chainId: parseInt(chainId) }
);

export default {
  fertilizer: Fertilizer__factory.connect("0x402c84De2Ce49aF88f5e2eF3710ff89bFED36cB6", provider),
  beanstalk:  Beanstalk__factory.connect("0xC1E088fC1323b20BCBee9bd1B9fC9546db5624C5", provider),
}