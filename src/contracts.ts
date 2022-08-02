import { ethers } from "ethers";
import { Beanstalk__factory, Fertilizer__factory } from "./generated";

///////////////////////////////// Constants /////////////////////////////////

const chainId = 1337;
const rpc = 'http://localhost:8545';

///////////////////////////////// Contracts /////////////////////////////////

const provider = new ethers.providers.JsonRpcProvider(
  rpc,
  { name: 'Unknown', chainId }
);

export default {
  fertilizer: Fertilizer__factory.connect("0x402c84De2Ce49aF88f5e2eF3710ff89bFED36cB6", provider),
  beanstalk:  Beanstalk__factory.connect("0xC1E088fC1323b20BCBee9bd1B9fC9546db5624C5", provider),
}