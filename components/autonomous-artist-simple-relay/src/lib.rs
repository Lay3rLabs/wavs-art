#[allow(warnings)]
mod bindings;
use alloy_sol_macro::sol;
use alloy_sol_types::SolValue;
use bindings::{
    export,
    wavs::worker::layer_types::{TriggerData, TriggerDataEvmContractEvent},
    Guest, TriggerAction, WasmResponse,
};
use wavs_wasi_utils::decode_event_log_data;

// Define Solidity types.
sol!("../../src/interfaces/IWavsNftServiceTypes.sol");

// Import solidity types for decoding / encoding.
use crate::IWavsNftServiceTypes::WavsNftMint;
struct Component;

impl Guest for Component {
    fn run(trigger_action: TriggerAction) -> std::result::Result<Option<WasmResponse>, String> {
        match trigger_action.data {
            TriggerData::EvmContractEvent(TriggerDataEvmContractEvent { log, .. }) => {
                // Decode the NewTrigger event to get the _triggerInfo bytes
                let WavsNftMint { triggerId, .. } = decode_event_log_data!(log)
                    .map_err(|e| format!("Failed to decode event log data: {}", e))?;

                eprintln!("Fulfilling Trigger ID: {}", triggerId);

                // Return the ABI-encoded triggerId
                Ok(Some(WasmResponse { payload: triggerId.abi_encode(), ordering: None }))
            }
            _ => Err("Unsupported trigger data".to_string()),
        }
    }
}

export!(Component with_types_in bindings);
