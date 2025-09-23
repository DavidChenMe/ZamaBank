import { task } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

task("deploy:zamabank", "Deploy ZamaBank contract")
  .setAction(async function (taskArguments: any, hre: HardhatRuntimeEnvironment) {
    const { deployer } = await hre.getNamedAccounts();
    const { deploy } = hre.deployments;

    console.log("Deploying contracts with the account:", deployer);

    // Deploy cUSDT first
    console.log("Deploying cUSDT...");
    const cUSDT = await deploy("cUSDT", {
      from: deployer,
      log: true,
    });

    console.log("cUSDT deployed to:", cUSDT.address);

    // Deploy ZamaBank
    console.log("Deploying ZamaBank...");
    const zamaBank = await deploy("ZamaBank", {
      from: deployer,
      args: [cUSDT.address],
      log: true,
    });

    console.log("ZamaBank deployed to:", zamaBank.address);

    // Save deployment info
    console.log("\n=== Deployment Summary ===");
    console.log("cUSDT Address:", cUSDT.address);
    console.log("ZamaBank Address:", zamaBank.address);
    console.log("Network:", hre.network.name);
    console.log("Deployer:", deployer);
  });