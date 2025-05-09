# wavs-art

demo

## run

```bash
# copy the example env file
cp .env.example .env

# Create new operator
cast wallet new-mnemonic --json > .docker/operator1.json
export OPERATOR_MNEMONIC=`cat .docker/operator1.json | jq -r .mnemonic`
export OPERATOR_PK=`cat .docker/operator1.json | jq -r '.accounts[0].private_key'`

# start the services
make start-all

# wait for the services to start
# while [ ! -f .docker/start.log ]; do echo "waiting for start.log" && sleep 1; done

# deploy the contracts
make deploy-contracts

# build the service
make build-service

# upload the service to IPFS
IPFS_CID=`make upload-to-ipfs`

# deploy the service
export DEPLOYER_PK=`cat .nodes/deployer`
export SERVICE_URL="http://127.0.0.1:8080/ipfs/$IPFS_CID"
CREDENTIAL=$DEPLOYER_PK make deploy-service

# register service operator
source .env
AVS_PRIVATE_KEY=`cast wallet private-key --mnemonic-path "$WAVS_SUBMISSION_MNEMONIC" --mnemonic-index 1`

# Faucet funds to the aggregator account to post on chain
cast send $(cast wallet address --private-key $WAVS_AGGREGATOR_CREDENTIAL) --rpc-url http://localhost:8545 --private-key $DEPLOYER_PK --value 1ether

# Register the operator with the WAVS service manager
AVS_PRIVATE_KEY=${AVS_PRIVATE_KEY} make operator-register

# Verify registration
make operator-list
```
