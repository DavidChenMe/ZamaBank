import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // First deploy cUSDT token if not already deployed
  const deployedCUSDT = await deploy("cUSDT", {
    from: deployer,
    log: true,
  });

  console.log(`cUSDT contract: `, deployedCUSDT.address);

  // Deploy ZamaBank with cUSDT address
  const deployedZamaBank = await deploy("ZamaBank", {
    from: deployer,
    args: [deployedCUSDT.address],
    log: true,
  });

  console.log(`ZamaBank contract: `, deployedZamaBank.address);
};

export default func;
func.id = "deploy_zamaBank";
func.tags = ["ZamaBank", "cUSDT"];