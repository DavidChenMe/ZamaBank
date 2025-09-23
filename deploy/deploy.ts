import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // Deploy cUSDT
  const cUSDT = await deploy("cUSDT", {
    from: deployer,
    log: true,
  });
  console.log(`cUSDT contract: `, cUSDT.address);

  // Deploy ZamaBank with cUSDT address
  const bank = await deploy("ZamaBank", {
    from: deployer,
    args: [cUSDT.address],
    log: true,
  });
  console.log(`ZamaBank contract: `, bank.address);
};
export default func;
func.id = "deploy_fheCounter"; // id required to prevent reexecution
func.tags = ["FHECounter"];
