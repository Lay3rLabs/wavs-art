use crate::bindings::host::get_evm_chain_config;
use alloy_network::Ethereum;
use alloy_provider::RootProvider;
use alloy_sol_types::sol;
use anyhow::Result;
use async_trait::async_trait;
use std::{collections::HashSet, str::FromStr};
use wavs_wasi_utils::evm::{
    alloy_primitives::{Address, U256},
    new_evm_provider,
};

use super::Source;

/// Compute rewards from an ERC721 token.
pub struct Erc721Source {
    /// Contract address.
    pub address: Address,
    /// Rewards per token.
    pub rewards_per_token: U256,
}

impl Erc721Source {
    pub fn new(address: &str, rewards_per_token: U256) -> Self {
        let nft_contract = Address::from_str(address).unwrap();
        Self { address: nft_contract, rewards_per_token }
    }
}

#[async_trait(?Send)]
impl Source for Erc721Source {
    fn get_name(&self) -> &str {
        "ERC721"
    }

    async fn get_accounts(&self) -> Result<Vec<String>> {
        let holders = self.query_holders().await?;
        Ok(holders)
    }

    async fn get_rewards(&self, account: &str) -> Result<U256> {
        let address = Address::from_str(account).unwrap();
        let nft_balance = self.query_nft_ownership(address).await?;
        Ok(self.rewards_per_token * nft_balance)
    }

    async fn get_metadata(&self) -> Result<serde_json::Value> {
        Ok(serde_json::json!({
            "address": self.address.to_string(),
            "rewards_per_token": self.rewards_per_token.to_string(),
        }))
    }
}

impl Erc721Source {
    async fn query_nft_ownership(&self, owner: Address) -> Result<U256> {
        let chain_config = get_evm_chain_config("local").unwrap();
        let provider: RootProvider<Ethereum> =
            new_evm_provider::<Ethereum>(chain_config.http_endpoint.unwrap());

        let contract = ERC721::new(self.address, &provider);
        let balance = contract.balanceOf(owner).call().await?;

        Ok(balance)
    }

    async fn query_holders(&self) -> Result<Vec<String>> {
        let chain_config = get_evm_chain_config("local").unwrap();
        let provider: RootProvider<Ethereum> =
            new_evm_provider::<Ethereum>(chain_config.http_endpoint.unwrap());

        let mut owners = HashSet::new();

        let contract = ERC721::new(self.address, &provider);
        let total_supply = contract.totalSupply().call().await?;

        let mut i = U256::ZERO;
        while i < total_supply {
            let owner = contract.ownerOfTokenByIndex(i).call().await?.to_string();
            owners.insert(owner);

            i += U256::ONE;
        }

        Ok(owners.into_iter().collect())
    }
}

sol! {
    #[sol(rpc)]
    contract ERC721 {
        function balanceOf(address owner) external view returns (uint256);
        function totalSupply() external view returns (uint256);
        function ownerOfTokenByIndex(uint256 index) external view returns (address);
    }
}
