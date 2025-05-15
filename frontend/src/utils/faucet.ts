import { getAccount } from "wagmi/actions";
import { getProvider } from "./clients";

// Request ETH from local Anvil faucet using anvil_setBalance RPC call
export async function requestFaucetEth(amount: string = "10"): Promise<string> {
  console.log(`Setting balance to ${amount} ETH via anvil_setBalance`);

  const account = getAccount();
  if (!account.address) {
    throw new Error("No account address available");
  }

  const provider = getProvider();

  // Convert ETH amount to wei (as hexadecimal string)
  const amountInWei = BigInt(parseFloat(amount) * 1e18).toString(16);
  const hexAmount = "0x" + amountInWei;

  try {
    // Use the RPC method anvil_setBalance directly
    // This method is specific to Anvil and directly sets an account's balance
    const result = await provider.send("anvil_setBalance", [
      account.address,
      hexAmount,
    ]);

    console.log("Balance set via anvil_setBalance:", result);
    return "Balance updated successfully";
  } catch (error) {
    console.error("Error setting balance via anvil_setBalance:", error);
    throw new Error(`Failed to set balance: ${error}`);
  }
}
