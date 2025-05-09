use crate::bindings::host::get_evm_chain_config;
use alloy_network::Ethereum;
use alloy_provider::{Provider, RootProvider};
use alloy_rpc_types::TransactionInput;
use alloy_sol_types::{sol, SolCall};
use wavs_wasi_utils::evm::{
    alloy_primitives::{Address, TxKind, U256},
    new_evm_provider,
};
use wstd::runtime::block_on;

sol! {
    interface IERC721 {
        function balanceOf(address owner) external view returns (uint256);
    }
}

pub fn query_nft_ownership(address: Address, nft_contract: Address) -> Result<bool, String> {
    block_on(async move {
        let chain_config = get_evm_chain_config("local").unwrap();
        let provider: RootProvider<Ethereum> =
            new_evm_provider::<Ethereum>(chain_config.http_endpoint.unwrap());

        let balance_call = IERC721::balanceOfCall { owner: address };
        let tx = alloy_rpc_types::eth::TransactionRequest {
            to: Some(TxKind::Call(nft_contract)),
            input: TransactionInput { input: Some(balance_call.abi_encode().into()), data: None },
            ..Default::default()
        };

        let result = provider.call(tx).await.map_err(|e| e.to_string())?;
        let balance: U256 = U256::from_be_slice(&result);
        Ok(balance > U256::ZERO)
    })
}
