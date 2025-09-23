// Addresses on Sepolia
export const CUSDT_ADDRESS = '0x8D112c4284F8F95a80d23b86F5a014828537d004' as `0x${string}`;
export const BANK_ADDRESS = '0x03E2C5179a834C9653630ace508106FF67fB17EF' as `0x${string}`;

// ABIs copied locally (no external imports)
import CUSDT_ABI_DATA from './abi/cUSDT';
import BANK_ABI_DATA from './abi/ZamaBank';

export const CUSDT_ABI = CUSDT_ABI_DATA;
export const BANK_ABI = BANK_ABI_DATA;
