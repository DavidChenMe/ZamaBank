// Addresses on Sepolia
export const CUSDT_ADDRESS = '0x8D112c4284F8F95a80d23b86F5a014828537d004' as `0x${string}`;
export const BANK_ADDRESS = '0x03E2C5179a834C9653630ace508106FF67fB17EF' as `0x${string}`;

// Use generated ABIs directly from deployments
import cUSDTDeployment from '../../../deployments/sepolia/cUSDT.json';
import bankDeployment from '../../../deployments/sepolia/ZamaBank.json';

export const CUSDT_ABI = cUSDTDeployment.abi as const;
export const BANK_ABI = bankDeployment.abi as const;

