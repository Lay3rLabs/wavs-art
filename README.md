# [WAVS](https://docs.wavs.xyz) Art Demo

WAVS demo that uses Ollama and Stable Diffusion to generate AI-generated NFTs, with a reward distribution system based on the NFTs minted.

## System Requirements

<details>
<summary>Core (Docker, Compose, Make, JQ, Node v21+, Foundry)</summary>

## Ubuntu Base

- **Linux**: `sudo apt update && sudo apt install build-essential`

### Docker

If prompted, remove containerd with `sudo apt remove containerd.io`.

- **MacOS**: `brew install --cask docker`
- **Linux**: `sudo apt -y install docker.io`
- **Windows WSL**: [docker desktop wsl](https://docs.docker.com/desktop/wsl/#turn-on-docker-desktop-wsl-2) & `sudo chmod 666 /var/run/docker.sock`
- [Docker Documentation](https://docs.docker.com/get-started/get-docker/)

### Docker Compose

- **MacOS**: Already installed with Docker installer
  > `sudo apt remove docker-compose-plugin` may be required if you get a `dpkg` error
- **Linux + Windows WSL**: `sudo apt-get install docker-compose-v2`
- [Compose Documentation](https://docs.docker.com/compose/)

### Make

- **MacOS**: `brew install make`
- **Linux + Windows WSL**: `sudo apt -y install make`
- [Make Documentation](https://www.gnu.org/software/make/manual/make.html)

### JQ

- **MacOS**: `brew install jq`
- **Linux + Windows WSL**: `sudo apt -y install jq`
- [JQ Documentation](https://jqlang.org/download/)

### Node.js

- **Required Version**: v21+
- [Installation via NVM](https://github.com/nvm-sh/nvm?tab=readme-ov-file#installing-and-updating)

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
nvm install --lts
```

### Foundry

```bash docci-ignore
curl -L https://foundry.paradigm.xyz | bash && $HOME/.foundry/bin/foundryup
```

</details>

<details>

<summary>Rust v1.85+</summary>

### Rust Installation

```bash docci-ignore
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

rustup toolchain install stable
rustup target add wasm32-wasip2
```

### Upgrade Rust

```bash docci-ignore
# Remove old targets if present
rustup target remove wasm32-wasi || true
rustup target remove wasm32-wasip1 || true

# Update and add required target
rustup update stable
rustup target add wasm32-wasip2
```

</details>

<details>
<summary>Cargo Components</summary>

### Install Cargo Components

On Ubuntu LTS, if you later encounter errors like:

```bash
wkg: /lib/x86_64-linux-gnu/libm.so.6: version `GLIBC_2.38' not found (required by wkg)
wkg: /lib/x86_64-linux-gnu/libc.so.6: version `GLIBC_2.39' not found (required by wkg)
```

If GLIB is out of date. Consider updating your system using:

```bash
sudo do-release-upgrade
```

```bash docci-ignore
# Install required cargo components
# https://github.com/bytecodealliance/cargo-component#installation
cargo install cargo-binstall
cargo binstall cargo-component wasm-tools warg-cli wkg --locked --no-confirm --force

# Configure default registry
# Found at: $HOME/.config/wasm-pkg/config.toml
wkg config --default-registry wa.dev

# Allow publishing to a registry
warg key new
```

</details>

<details>
<summary>NVIDIA Container Toolkit</summary>

The [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html) lets Docker use the GPU.

```bash
# install
distribution=$(. /etc/os-release;echo $ID$VERSION_ID) \
&& curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add - \
&& curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list
sudo apt-get update && sudo apt-get install -y nvidia-docker2
sudo systemctl restart docker

# test
docker run --rm --gpus all nvidia/cuda:12.3.1-base-ubuntu20.04 nvidia-smi
```

</details>

### Solidity

Install the required packages to build the Solidity contracts. This project supports both [submodules](./.gitmodules) and [npm packages](./package.json).

```bash
# Install packages (npm & submodules)
make setup

# Build the contracts
forge build

# Run the solidity tests
forge test
```

## Build WASI components

Now build the WASI components into the `compiled` output directory.

> \[!WARNING]
> If you get: `error: no registry configured for namespace "wavs"`
>
> run, `wkg config --default-registry wa.dev`

> \[!WARNING]
> If you get: `failed to find the 'wasm32-wasip1' target and 'rustup' is not available`
>
> `brew uninstall rust` & install it from <https://rustup.rs>

```bash
# Remove `WASI_BUILD_DIR` to build all components.
make wasi-build
```

## WAVS

> \[!NOTE]
> If you are running on a Mac with an ARM chip, you will need to do the following:
>
> - Set up Rosetta: `softwareupdate --install-rosetta`
> - Enable Rosetta (Docker Desktop: Settings -> General -> enable "Use Rosetta for x86_64/amd64 emulation on Apple Silicon")
>
> Configure one of the following networking:
>
> - Docker Desktop: Settings -> Resources -> Network -> 'Enable Host Networking'
> - `brew install chipmk/tap/docker-mac-net-connect && sudo brew services start chipmk/tap/docker-mac-net-connect`

## Start Environment

Start an ethereum node (anvil), the WAVS service, and deploy [eigenlayer](https://www.eigenlayer.xyz/) contracts to the local network.

### Enable Telemetry (optional)

Set Log Level:

- Open the `.env` file.
- Set the `log_level` variable for wavs to debug to ensure detailed logs are captured.

> \[!NOTE]
> To see details on how to access both traces and metrics, please check out [Telemetry Documentation](telemetry/telemetry.md).

### Start the backend

```bash docci-background docci-delay-after=5
# This must remain running in your terminal. Use another terminal to run other commands.
# You can stop the services with `ctrl+c`. Some MacOS terminals require pressing it twice.
cp .env.example .env

# update the .env for either LOCAL or TESTNET

# Starts anvil + IPFS, WARG, Jaeger, prometheus, Ollama, and Stable Diffusion.
make start-all-local
# OR no GPU, use CPU instead (very slow)
make start-all-local-cpu
```

## Create Deployer, upload Eigenlayer

These sections can be run on the **same** machine, or separate for testnet environments. Run the following steps on the deployer/aggregator machine.

```bash
# local: create deployer & auto fund. testnet: create & iterate check balance
bash ./script/create-deployer.sh

## Deploy Eigenlayer from Deployer
COMMAND=deploy make wavs-middleware
```

## Deploy Service Contracts

**Key Concepts:**

- **Trigger Contract:** Any contract that emits events, then WAVS monitors. When a relevant event occurs, WAVS triggers the execution of your WebAssembly component.
- **Submission Contract:** This contract is used by the AVS service operator to submit the results generated by the WAVS component on-chain.

`WAVS_SERVICE_MANAGER_ADDRESS` is the address of the Eigenlayer service manager contract. It was deployed in the previous step. Then you deploy the trigger and submission contracts which depends on the service manager. The service manager will verify that a submission is valid (from an authorized operator) before saving it to the blockchain. The trigger contract is any arbitrary contract that emits some event that WAVS will watch for. Yes, this can be on another chain (e.g. an L2) and then the submission contract on the L1 _(Ethereum for now because that is where Eigenlayer is deployed)_.

```bash docci-delay-per-cmd=2
# Forge deploy contracts
make deploy-contracts
```

## Deploy Service

Deploy the compiled components with the contract information from the previous steps. Review the [makefile](./Makefile) for more details and configuration options.

```bash docci-delay-per-cmd=3
# ** Testnet Setup: https://wa.dev/account/credentials

COMPONENT_FILENAME=rewards.wasm PKG_NAME="rewards" PKG_VERSION="0.4.0-rc.1" source script/upload-to-wasi-registry.sh || true
COMPONENT_FILENAME=autonomous_artist.wasm PKG_NAME="autonomous-artist" PKG_VERSION="0.4.0-rc.1" source script/upload-to-wasi-registry.sh || true
COMPONENT_FILENAME=autonomous_artist_simple_relay.wasm PKG_NAME="autonomous-artist-simple-relay" PKG_VERSION="0.4.0-rc.1" source script/upload-to-wasi-registry.sh || true

# Testnet: set values (default: local if not set)
# export TRIGGER_CHAIN=holesky
# export SUBMIT_CHAIN=holesky

# Package not found with wa.dev? -- make sure it is public
export AGGREGATOR_URL=http://127.0.0.1:8001
REGISTRY=${REGISTRY} bash ./script/build_service.sh
```

## Upload to IPFS

```bash
# local
export DEPLOYER_PK=$(cat .nodes/deployer)
export WAVS_SERVICE_MANAGER_ADDRESS=$(jq -r .addresses.WavsServiceManager ./.nodes/avs_deploy.json)

# Upload service.json to IPFS
SERVICE_FILE=.docker/service.json source ./script/ipfs-upload.sh
```

## Start Aggregator

**TESTNET** You can move the aggregator it to its own machine for testnet deployments, it's easiest to run this on the deployer machine first. If moved, ensure you set the env variables correctly (copy pasted from the previous steps on the other machine).

```bash
bash ./script/create-aggregator.sh 1

IPFS_GATEWAY=${IPFS_GATEWAY} bash ./infra/aggregator-1/start.sh

wget -q --header="Content-Type: application/json" --post-data="{\"uri\": \"${IPFS_URI}\"}" ${AGGREGATOR_URL}/register-service -O -
```

## Start WAVS

**TESTNET** The WAVS service should be run in its own machine (creation, start, and opt-in). If moved, make sure you set the env variables correctly (copy pasted from the previous steps on the other machine).

```bash
bash ./script/create-operator.sh 1
```

Set the following environment variables in the `./infra/wavs-1/.env` file:

- `WAVS_ENV_PINATA_API_KEY`
- `IPFS_GATEWAY_URL`

These come from [https://pinata.cloud](pinata.cloud) and are used to upload NFT metadata to IPFS.

```bash
IPFS_GATEWAY=${IPFS_GATEWAY} bash ./infra/wavs-1/start.sh

# Deploy the service JSON to WAVS so it now watches and submits.
# 'opt in' for WAVS to watch (this is before we register to Eigenlayer)
WAVS_ENDPOINT=http://127.0.0.1:8000 SERVICE_URL=${IPFS_URI} IPFS_GATEWAY=${IPFS_GATEWAY} make deploy-service
```

## Register service specific operator

Making test mnemonic: `cast wallet new-mnemonic --json | jq -r .mnemonic`

Each service gets their own key path (hd_path). The first service starts at 1 and increments from there. Get the service ID

```bash
source ./script/avs-signing-key.sh

# TESTNET: set WAVS_SERVICE_MANAGER_ADDRESS
COMMAND="register ${OPERATOR_PRIVATE_KEY} ${AVS_SIGNING_ADDRESS} 0.001ether" make wavs-middleware

# Verify registration
COMMAND="list_operator" PAST_BLOCKS=500 make wavs-middleware
```

## Trigger the Service

### Mint NFT

```bash
PROMPT="mystical governance" make mint-nft
```

### Update NFT

```bash
PROMPT="natural governance" TOKEN_ID=0 make update-nft
```

### Show NFT

```bash
make show-nft
```

### Update Rewards

```bash
make update-rewards
```

### Claim Rewards

```bash
make claim-rewards
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

# Claude Code

To spin up a sandboxed instance of [Claude Code](https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview) in a Docker container that only has access to this project's files, run the following command:

```bash docci-ignore
npm run claude-code
# or with no restrictions (--dangerously-skip-permissions)
npm run claude-code:unrestricted
```
